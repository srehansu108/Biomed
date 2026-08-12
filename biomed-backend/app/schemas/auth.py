from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
import re

class UserRegister(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=6, max_length=72)
    date_of_birth: str
    gender: str
    address: dict
    
    @validator('password')
    def validate_password_length(cls, v):
        """Ensure password doesn't exceed 72 bytes"""
        if len(v.encode('utf-8')) > 72:
            raise ValueError('Password too long. Maximum 72 characters.')
        return v
    
    @validator('phone')
    def validate_phone(cls, v):
        """Validate phone number format"""
        v = re.sub(r'\D', '', v)  # Remove non-digit characters
        if len(v) < 10 or len(v) > 15:
            raise ValueError('Phone number must be between 10 and 15 digits')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    patient_id: str
    registration_complete: Optional[bool] = False

class WebAuthnRegistrationOptions(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class WebAuthnRegistrationVerify(BaseModel):
    credential: Dict[str, Any]
    email: EmailStr

class WebAuthnLoginOptions(BaseModel):
    email: EmailStr

class WebAuthnLoginVerify(BaseModel):
    credential: Dict[str, Any]
    email: EmailStr

# ✅ Add this schema for check-registration-status
class CheckRegistrationStatus(BaseModel):
    patient_id: str