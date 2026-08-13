from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class WebAuthnCredential(BaseModel):
    credential_id: str
    patient_id: str
    public_key: bytes
    sign_count: int = 0
    created_at: datetime = datetime.now()
    last_used: Optional[datetime] = None

class WebAuthnChallenge(BaseModel):  # ✅ ADDED: Challenge model
    challenge: bytes
    email: str
    patient_id: str
    created_at: datetime = datetime.now()
    expires_at: float  # Unix timestamp