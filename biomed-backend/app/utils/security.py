from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import EmailStr
import logging

from app.config import settings
from app.database.mongodb import database

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security scheme for token validation
security_scheme = HTTPBearer()


# ============================================
# PASSWORD FUNCTIONS
# ============================================

def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)


# ============================================
# JWT TOKEN FUNCTIONS
# ============================================

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Add issued at time
    to_encode.update({"iat": datetime.utcnow()})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT access token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.error(f"Token decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================
# USER AUTHENTICATION FUNCTIONS
# ============================================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict[str, Any]:
    """
    Get the current authenticated user from the JWT token
    
    Args:
        credentials: HTTP Bearer token credentials
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        
        # Get email from token
        email = payload.get("sub")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get patient_id from token
        patient_id = payload.get("patient_id")
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing patient_id",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user = await database.db.patients.find_one(
            {"email": email, "patient_id": patient_id}
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Convert ObjectId to string
        user["_id"] = str(user["_id"])
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_active_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get the current active user (additional validation)
    
    Args:
        current_user: User from get_current_user
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user is not active
    """
    # Check if user is active (you can add more checks here)
    if not current_user.get("patient_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return current_user


async def get_current_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Get the current user and verify they are an admin
    
    Args:
        current_user: User from get_current_user
        
    Returns:
        User data dictionary
        
    Raises:
        HTTPException: If user is not an admin
    """
    role = current_user.get("role", "patient")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    
    return current_user


# ============================================
# TOKEN VALIDATION FUNCTIONS
# ============================================

async def validate_token(token: str) -> bool:
    """
    Validate a JWT token without raising exceptions
    
    Args:
        token: JWT token string
        
    Returns:
        True if valid, False otherwise
    """
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            return False
        return True
    except:
        return False


def get_token_payload(token: str) -> Optional[Dict[str, Any]]:
    """
    Get the payload from a token without raising exceptions
    
    Args:
        token: JWT token string
        
    Returns:
        Token payload or None if invalid
    """
    try:
        return decode_access_token(token)
    except:
        return None


# ============================================
# OPTIONAL: EMAIL VERIFICATION TOKEN (if needed)
# ============================================

def create_verification_token(email: EmailStr) -> str:
    """
    Create a short-lived token for email verification
    
    Args:
        email: Email address to verify
        
    Returns:
        JWT token string
    """
    data = {
        "sub": email,
        "type": "verification"
    }
    expires_delta = timedelta(hours=24)  # 24 hours
    return create_access_token(data, expires_delta)


async def verify_email_token(token: str) -> Optional[str]:
    """
    Verify an email verification token
    
    Args:
        token: JWT token string
        
    Returns:
        Email if valid, None otherwise
    """
    try:
        payload = decode_access_token(token)
        token_type = payload.get("type")
        email = payload.get("sub")
        
        if token_type != "verification" or not email:
            return None
        
        return email
    except:
        return None


# ============================================
# PASSWORD RESET TOKEN (optional)
# ============================================

def create_password_reset_token(email: EmailStr) -> str:
    """
    Create a short-lived token for password reset
    
    Args:
        email: Email address to reset password for
        
    Returns:
        JWT token string
    """
    data = {
        "sub": email,
        "type": "password_reset"
    }
    expires_delta = timedelta(hours=1)  # 1 hour
    return create_access_token(data, expires_delta)


async def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset token
    
    Args:
        token: JWT token string
        
    Returns:
        Email if valid, None otherwise
    """
    try:
        payload = decode_access_token(token)
        token_type = payload.get("type")
        email = payload.get("sub")
        
        if token_type != "password_reset" or not email:
            return None
        
        return email
    except:
        return None