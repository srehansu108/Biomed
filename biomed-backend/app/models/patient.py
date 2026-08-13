from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class Address(BaseModel):
    street: str
    city: str
    state: str
    pincode: str
    country: str = "India"

class Patient(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    patient_id: str
    full_name: str
    date_of_birth: datetime
    gender: str
    phone: str
    email: EmailStr
    address: Address
    allergies: List[str] = []
    medical_notes: Optional[str] = None
    has_biometric: bool = False
    registration_complete: bool = False
    role: str = "patient"  # ✅ ADDED: "patient" or "admin"
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True