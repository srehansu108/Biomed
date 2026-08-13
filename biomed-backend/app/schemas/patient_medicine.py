from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientMedicineCreate(BaseModel):
    patient_id: str
    medicine_id: str
    medicine_name: str
    category: str
    dosage: str
    quantity: int
    price: float
    prescribed_by: str = "Admin"
    expiry_date: Optional[datetime] = None
    notes: Optional[str] = None

class PatientMedicineUpdate(BaseModel):
    dosage: Optional[str] = None
    quantity: Optional[int] = None
    remaining_quantity: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    expiry_date: Optional[datetime] = None