from fastapi import APIRouter, HTTPException
from typing import List, Optional
from ..database.mongodb import database

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/")
async def get_all_patients(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None
):
    """Get all patients (for admin)"""
    query = {}
    
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"patient_id": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = database.db.patients.find(query).skip(skip).limit(limit)
    patients = await cursor.to_list(length=limit)
    
    # Remove sensitive data
    for patient in patients:
        patient.pop("password_hash", None)
        patient["_id"] = str(patient["_id"])
    
    return patients

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient by ID"""
    patient = await database.db.patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Remove sensitive data
    patient.pop("password_hash", None)
    patient["_id"] = str(patient["_id"])
    
    return patient

@router.get("/stats/overview")
async def get_patient_stats():
    """Get patient statistics for admin"""
    total = await database.db.patients.count_documents({})
    with_biometric = await database.db.patients.count_documents({"has_biometric": True})
    registered = await database.db.patients.count_documents({"registration_complete": True})
    
    return {
        "total_patients": total,
        "with_biometric": with_biometric,
        "registered_complete": registered,
        "pending_registration": total - registered
    }