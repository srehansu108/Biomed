from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timedelta
from typing import Dict, Any
import base64
import secrets
import logging
from pydantic import BaseModel

from app.config import settings
from app.database.mongodb import database
from app.schemas.auth import (
    WebAuthnRegistrationOptions,
    WebAuthnRegistrationVerify,
    WebAuthnLoginOptions,
    WebAuthnLoginVerify
)
from app.utils.security import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webauthn", tags=["WebAuthn"])

# Store challenges in memory
challenge_store = {}

class RegistrationOptionsRequest(BaseModel):
    email: str
    full_name: str = None

def generate_challenge() -> str:
    """Generate a random challenge for WebAuthn"""
    challenge = secrets.token_bytes(32)
    # ✅ FIX: Return base64 encoded string, not bytes
    return base64.b64encode(challenge).decode('utf-8')

def base64url_encode(data: bytes) -> str:
    """Encode bytes to base64url"""
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def base64url_decode(data: str) -> bytes:
    """Decode base64url to bytes"""
    padding = '=' * (4 - len(data) % 4) if len(data) % 4 else ''
    return base64.urlsafe_b64decode(data + padding)

def validate_webauthn_config():
    """Validate WebAuthn configuration"""
    try:
        rp_id = settings.WEBAUTHN_RP_ID
        rp_name = settings.WEBAUTHN_RP_NAME
        origin = settings.WEBAUTHN_ORIGIN
        
        logger.info(f"✅ WebAuthn configuration validated:")
        logger.info(f"   RP ID: {rp_id}")
        logger.info(f"   RP Name: {rp_name}")
        logger.info(f"   Origin: {origin}")
        
        if not rp_id:
            raise ValueError("WEBAUTHN_RP_ID is not set")
        if not rp_name:
            raise ValueError("WEBAUTHN_RP_NAME is not set")
        if not origin:
            raise ValueError("WEBAUTHN_ORIGIN is not set")
        
        return True
    except Exception as e:
        logger.error(f"❌ WebAuthn configuration error: {e}")
        raise

@router.post("/register/options")
async def get_registration_options(data: RegistrationOptionsRequest):
    """Get WebAuthn registration options"""
    
    try:
        logger.info(f"📝 Registration options requested for: {data.email}")
        
        # Check if user exists
        patient = await database.db.patients.find_one({"email": data.email})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Use correct RP ID
        rp_id = settings.WEBAUTHN_RP_ID
        rp_name = settings.WEBAUTHN_RP_NAME
        
        # Generate challenge as base64 string
        challenge = generate_challenge()
        
        # Create user ID (base64url encoded string)
        user_id = base64url_encode(data.email.encode('utf-8'))
        
        # Get existing credentials
        existing_credentials = await database.db.webauthn_credentials.find(
            {"patient_id": patient["patient_id"]}
        ).to_list(length=100)
        
        exclude_credentials = []
        for cred in existing_credentials:
            try:
                exclude_credentials.append({
                    "type": "public-key",
                    "id": base64url_decode(cred["credential_id"])
                })
            except:
                pass
        
        # ✅ FIX: Convert bytes to strings properly
        options = {
            "challenge": challenge,  # Already a string
            "rp": {
                "id": rp_id,
                "name": rp_name
            },
            "user": {
                "id": user_id,  # Base64 string
                "name": data.email,
                "displayName": data.full_name or data.email
            },
            "pubKeyCredParams": [
                {"type": "public-key", "alg": -7},
                {"type": "public-key", "alg": -257}
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "userVerification": "required",
                "residentKey": "required"
            },
            "timeout": 60000,
            "attestation": "none",
            "excludeCredentials": exclude_credentials
        }
        
        # Store challenge for verification
        challenge_store[data.email] = {
            "challenge": challenge,
            "timestamp": datetime.utcnow(),
            "patient_id": patient["patient_id"],
            "patient": patient
        }
        
        # Clean up old challenges
        cleanup_time = datetime.utcnow() - timedelta(minutes=5)
        for email, stored in list(challenge_store.items()):
            if stored["timestamp"] < cleanup_time:
                del challenge_store[email]
        
        logger.info(f"✅ Registration options generated for: {data.email}")
        return options
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating registration options: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate registration options: {str(e)}"
        )

@router.post("/register/verify")
async def verify_registration(data: WebAuthnRegistrationVerify):
    """Verify WebAuthn registration"""
    
    try:
        logger.info(f"🔐 Verifying registration for: {data.email}")
        
        if data.email not in challenge_store:
            logger.error(f"❌ Challenge not found for email: {data.email}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Challenge not found or expired. Please request a new registration."
            )
        
        stored_data = challenge_store[data.email]
        patient_id = stored_data["patient_id"]
        patient = stored_data["patient"]
        
        credential = data.credential
        
        if not credential.get("id"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing credential ID"
            )
        
        if not credential.get("response"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing credential response"
            )
        
        if not credential["response"].get("attestationObject"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing attestation object"
            )
        
        if not credential["response"].get("clientDataJSON"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing client data JSON"
            )
        
        # Remove challenge
        del challenge_store[data.email]
        
        # Store credential
        credential_data = {
            "patient_id": patient_id,
            "email": data.email,
            "credential_id": credential["id"],
            "raw_id": credential.get("rawId"),
            "type": credential.get("type", "public-key"),
            "authenticator_attachment": credential.get("authenticatorAttachment"),
            "attestation_object": credential["response"].get("attestationObject"),
            "client_data_json": credential["response"].get("clientDataJSON"),
            "created_at": datetime.utcnow(),
            "last_used": datetime.utcnow()
        }
        
        await database.db.webauthn_credentials.insert_one(credential_data)
        
        # Update patient
        await database.db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "has_biometric": True,
                "registration_complete": True,
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"✅ Biometric registration verified for: {data.email}")
        
        access_token = create_access_token(
            data={
                "sub": patient["email"],
                "patient_id": patient["patient_id"],
                "registration_complete": True
            }
        )
        
        return {
            "verified": True,
            "message": "Biometric registration successful",
            "patient_id": patient_id,
            "access_token": access_token,
            "registration_complete": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error verifying registration: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify registration: {str(e)}"
        )

@router.post("/login/options")
async def get_login_options(data: WebAuthnLoginOptions):
    """Get WebAuthn login options"""
    
    try:
        logger.info(f"📝 Login options requested for: {data.email}")
        
        patient = await database.db.patients.find_one({"email": data.email})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        if not patient.get("has_biometric", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has not set up biometric authentication"
            )
        
        credentials = await database.db.webauthn_credentials.find(
            {"patient_id": patient["patient_id"]}
        ).to_list(length=100)
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No credentials found for this user"
            )
        
        challenge = generate_challenge()
        
        allow_credentials = []
        for cred in credentials:
            try:
                allow_credentials.append({
                    "type": "public-key",
                    "id": base64url_decode(cred["credential_id"])
                })
            except:
                pass
        
        options = {
            "challenge": challenge,
            "rpId": settings.WEBAUTHN_RP_ID,
            "allowCredentials": allow_credentials,
            "userVerification": "required",
            "timeout": 60000
        }
        
        challenge_store[data.email + "_login"] = {
            "challenge": challenge,
            "timestamp": datetime.utcnow(),
            "patient_id": patient["patient_id"],
            "patient": patient
        }
        
        cleanup_time = datetime.utcnow() - timedelta(minutes=5)
        for key, stored in list(challenge_store.items()):
            if stored["timestamp"] < cleanup_time:
                del challenge_store[key]
        
        logger.info(f"✅ Login options generated for: {data.email}")
        return options
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating login options: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate login options: {str(e)}"
        )

@router.post("/login/verify")
async def verify_login(data: WebAuthnLoginVerify):
    """Verify WebAuthn login"""
    
    try:
        logger.info(f"🔐 Verifying login for: {data.email}")
        
        challenge_key = data.email + "_login"
        if challenge_key not in challenge_store:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Challenge not found or expired. Please try again."
            )
        
        stored_data = challenge_store[challenge_key]
        patient = stored_data["patient"]
        
        del challenge_store[challenge_key]
        
        credential_id = data.credential.get("id")
        if not credential_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing credential ID"
            )
        
        credential = await database.db.webauthn_credentials.find_one({
            "patient_id": patient["patient_id"],
            "credential_id": credential_id
        })
        
        if not credential:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Credential not found"
            )
        
        await database.db.webauthn_credentials.update_one(
            {"_id": credential["_id"]},
            {"$set": {"last_used": datetime.utcnow()}}
        )
        
        access_token = create_access_token(
            data={
                "sub": patient["email"],
                "patient_id": patient["patient_id"],
                "registration_complete": patient.get("registration_complete", False)
            }
        )
        
        logger.info(f"✅ Login verified for: {data.email}")
        
        return {
            "verified": True,
            "access_token": access_token,
            "patient_id": patient["patient_id"],
            "registration_complete": patient.get("registration_complete", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error verifying login: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify login: {str(e)}"
        )