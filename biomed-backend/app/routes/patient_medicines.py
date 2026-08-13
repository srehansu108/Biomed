from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from ..database.mongodb import database
from bson import ObjectId

router = APIRouter(prefix="/patient-medicines", tags=["Patient Medicines"])

@router.post("/")
async def assign_medicine_to_patient(data: dict):
    """Admin assigns/prescribes medicine to a patient"""
    
    # Check if patient exists
    patient = await database.db.patients.find_one({"patient_id": data.get("patient_id")})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if medicine exists
    medicine = await database.db.medicines.find_one({"medicine_id": data.get("medicine_id")})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Create patient medicine record
    patient_medicine = {
        "patient_id": data["patient_id"],
        "medicine_id": data["medicine_id"],
        "medicine_name": data["medicine_name"],
        "category": data["category"],
        "dosage": data.get("dosage", ""),
        "quantity": data.get("quantity", 1),
        "remaining_quantity": data.get("quantity", 1),
        "price": data.get("price", 0),
        "status": "active",
        "prescribed_by": data.get("prescribed_by", "Admin"),
        "prescribed_date": datetime.now(),
        "expiry_date": data.get("expiry_date"),
        "notes": data.get("notes", ""),
        "requires_prescription": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    result = await database.db.patient_medicines.insert_one(patient_medicine)
    patient_medicine["_id"] = str(result.inserted_id)
    
    return patient_medicine

@router.get("/patient/{patient_id}")
async def get_patient_medicines(patient_id: str):
    """Get all medicines assigned to a specific patient"""
    
    cursor = database.db.patient_medicines.find({"patient_id": patient_id}).sort("created_at", -1)
    medicines = await cursor.to_list(length=100)
    
    for med in medicines:
        med["_id"] = str(med["_id"])
    
    return medicines

@router.patch("/{patient_medicine_id}/consume")
async def consume_medicine(patient_medicine_id: str, quantity: int = 1):
    """Patient consumes medicine (decrease remaining quantity)"""
    
    medicine = await database.db.patient_medicines.find_one({
        "_id": ObjectId(patient_medicine_id)
    })
    if not medicine:
        raise HTTPException(status_code=404, detail="Patient medicine not found")
    
    if medicine["remaining_quantity"] < quantity:
        raise HTTPException(status_code=400, detail="Insufficient remaining quantity")
    
    new_remaining = medicine["remaining_quantity"] - quantity
    
    await database.db.patient_medicines.update_one(
        {"_id": ObjectId(patient_medicine_id)},
        {"$set": {
            "remaining_quantity": new_remaining,
            "updated_at": datetime.now()
        }}
    )
    
    # If remaining quantity is 0, mark as completed
    if new_remaining == 0:
        await database.db.patient_medicines.update_one(
            {"_id": ObjectId(patient_medicine_id)},
            {"$set": {"status": "completed"}}
        )
    
    return {"message": f"Consumed {quantity} unit(s)", "remaining": new_remaining}

@router.delete("/{patient_medicine_id}")
async def remove_patient_medicine(patient_medicine_id: str):
    """Remove a medicine from patient's list"""
    
    result = await database.db.patient_medicines.delete_one({
        "_id": ObjectId(patient_medicine_id)
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patient medicine not found")
    
    return {"message": "Medicine removed from patient's list"}