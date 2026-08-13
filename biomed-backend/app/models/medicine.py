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
    medicine_id: str
    name: str
    category: str
    description: Optional[str] = None
    quantity: int = 0
    price: float = 0.0
    manufacturer: str
    batch_number: str
    expiry_date: datetime
    requires_prescription: bool = False
    is_available: bool = True
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True