from fastapi import APIRouter, HTTPException, Depends
from typing import List
from ..database.mongodb import database
from ..models.patient import Patient

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.get("/")
async def get_all_patients(skip: int = 0, limit: int = 100):
    """Get all patients"""
    cursor = database.db.patients.find().skip(skip).limit(limit)
    patients = await cursor.to_list(length=limit)
    return patients

@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient by ID"""
    patient = await database.db.patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.get("/{patient_id}/prescriptions")
async def get_patient_prescriptions(patient_id: str):
    """Get all prescriptions for a patient"""
    prescriptions = await database.db.prescriptions.find({"patient_id": patient_id}).to_list(length=100)
    return prescriptions