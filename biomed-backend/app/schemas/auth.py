from pydantic import BaseModel, EmailStr
from typing import Optional

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    date_of_birth: str
    gender: str
    address: dict

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    patient_id: str

class WebAuthnRegistrationOptions(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class WebAuthnRegistrationVerify(BaseModel):
    credential: dict
    email: EmailStr

class WebAuthnLoginOptions(BaseModel):
    email: EmailStr

class WebAuthnLoginVerify(BaseModel):
    credential: dict
    email: EmailStr