from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class Medicine(BaseModel):
    medicine_id: str
    name: str
    generic_name: str
    manufacturer: str
    category: str
    batch_number: str
    expiry_date: datetime
    quantity: int
    price: float
    prescription_required: bool = True
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()