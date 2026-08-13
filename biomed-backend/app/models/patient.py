from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
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

class PatientMedicine(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    patient_id: str
    medicine_id: str
    medicine_name: str
    category: str
    dosage: str  # e.g., "1 tablet twice daily"
    quantity: int  # Total quantity prescribed
    remaining_quantity: int  # Remaining quantity
    price: float
    status: str = "active"  # active, completed, expired, cancelled
    prescribed_by: str  # Admin/Doctor name
    prescribed_date: datetime = datetime.now()
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    requires_prescription: bool = True
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True