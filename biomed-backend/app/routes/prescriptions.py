from fastapi import APIRouter, HTTPException, Depends
from typing import List
from datetime import datetime
from ..database.mongodb import database
from ..models.prescription import Prescription
from ..models.medicine import Medicine

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

@router.get("/")
async def get_all_prescriptions(skip: int = 0, limit: int = 100):
    """Get all prescriptions"""
    cursor = database.db.prescriptions.find().skip(skip).limit(limit)
    prescriptions = await cursor.to_list(length=limit)
    return prescriptions

@router.get("/{prescription_id}")
async def get_prescription(prescription_id: str):
    """Get prescription by ID"""
    prescription = await database.db.prescriptions.find_one({"prescription_id": prescription_id})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription

@router.post("/")
async def create_prescription(prescription: Prescription):
    """Create a new prescription"""
    # Check if prescription ID already exists
    existing = await database.db.prescriptions.find_one({"prescription_id": prescription.prescription_id})
    if existing:
        raise HTTPException(status_code=400, detail="Prescription ID already exists")
    
    # Check if patient exists
    patient = await database.db.patients.find_one({"patient_id": prescription.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Verify medicines exist and have stock
    for med in prescription.medicines:
        medicine = await database.db.medicines.find_one({"name": med.medicine_name})
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine '{med.medicine_name}' not found")
        if medicine["quantity"] < med.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient stock for '{med.medicine_name}'. Available: {medicine['quantity']}"
            )
    
    # Create prescription
    prescription_dict = prescription.dict()
    result = await database.db.prescriptions.insert_one(prescription_dict)
    
    return {**prescription_dict, "_id": str(result.inserted_id)}

@router.put("/{prescription_id}")
async def update_prescription(prescription_id: str, prescription: Prescription):
    """Update a prescription"""
    existing = await database.db.prescriptions.find_one({"prescription_id": prescription_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    prescription_dict = prescription.dict()
    await database.db.prescriptions.update_one(
        {"prescription_id": prescription_id},
        {"$set": prescription_dict}
    )
    
    return {**prescription_dict, "_id": str(existing["_id"])}

@router.delete("/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription"""
    result = await database.db.prescriptions.delete_one({"prescription_id": prescription_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return {"message": "Prescription deleted successfully"}

@router.get("/patient/{patient_id}")
async def get_patient_prescriptions(patient_id: str):
    """Get all prescriptions for a patient"""
    prescriptions = await database.db.prescriptions.find(
        {"patient_id": patient_id}
    ).to_list(length=100)
    return prescriptions

@router.patch("/{prescription_id}/status")
async def update_prescription_status(prescription_id: str, status: str):
    """Update prescription status"""
    valid_statuses = ["active", "dispensed", "expired", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    result = await database.db.prescriptions.update_one(
        {"prescription_id": prescription_id},
        {"$set": {"status": status, "updated_at": datetime.now()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    return {"message": f"Prescription status updated to {status}"}

@router.post("/{prescription_id}/dispense")
async def dispense_prescription(prescription_id: str):
    """Dispense a prescription (decrease medicine stock)"""
    # Get prescription
    prescription = await database.db.prescriptions.find_one({"prescription_id": prescription_id})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    if prescription["status"] != "active":
        raise HTTPException(status_code=400, detail="Prescription is not active")
    
    # Update stock for each medicine
    for med in prescription["medicines"]:
        result = await database.db.medicines.update_one(
            {"name": med["medicine_name"]},
            {"$inc": {"quantity": -med["quantity"]}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail=f"Medicine '{med['medicine_name']}' not found")
    
    # Update prescription status
    await database.db.prescriptions.update_one(
        {"prescription_id": prescription_id},
        {"$set": {"status": "dispensed", "updated_at": datetime.now()}}
    )
    
    return {"message": "Prescription dispensed successfully", "prescription_id": prescription_id}