from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MedicineCreate(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    quantity: int = 0
    price: float = 0.0
    manufacturer: str
    batch_number: str
    expiry_date: datetime
    requires_prescription: bool = False

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    price: Optional[float] = None
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[datetime] = None
    requires_prescription: Optional[bool] = None
    is_available: Optional[bool] = None