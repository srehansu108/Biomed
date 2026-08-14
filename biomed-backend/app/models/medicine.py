from datetime import datetime
from typing import Optional
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

class Medicine(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    medicine_id: Optional[str] = None
    name: str
    category: str
    description: Optional[str] = None
    quantity: int = 0
    price: float = 0.0
    manufacturer: str
    batch_number: str
    expiry_date: Optional[datetime] = None
    requires_prescription: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True