from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class MedicineDosage(BaseModel):
    medicine_name: str
    quantity: int
    dosage: str
    frequency: str
    duration: str

class Prescription(BaseModel):
    prescription_id: str
    patient_id: str
    doctor_name: str
    doctor_id: Optional[str] = None
    date: datetime
    medicines: List[MedicineDosage]
    notes: Optional[str] = None
    status: str = "active"  # active, dispensed, expired, cancelled
    digital_signature: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()