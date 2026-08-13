from fastapi import APIRouter, HTTPException
from typing import Optional  # ✅ Add this import
from datetime import datetime
from ..database.mongodb import database
from ..schemas.patient_medicine import PatientMedicineCreate, PatientMedicineUpdate
from bson import ObjectId

router = APIRouter(prefix="/patient-medicines", tags=["Patient Medicines"])

@router.post("/")
async def assign_medicine_to_patient(data: PatientMedicineCreate):
    """Admin assigns/prescribes medicine to a patient"""
    
    # Check if patient exists
    patient = await database.db.patients.find_one({"patient_id": data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if medicine exists
    medicine = await database.db.medicines.find_one({"medicine_id": data.medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Create patient medicine record
    patient_medicine = {
        "patient_id": data.patient_id,
        "medicine_id": data.medicine_id,
        "medicine_name": data.medicine_name,
        "category": data.category,
        "dosage": data.dosage,
        "quantity": data.quantity,
        "remaining_quantity": data.quantity,
        "price": data.price,
        "status": "active",
        "prescribed_by": data.prescribed_by,
        "prescribed_date": datetime.now(),
        "expiry_date": data.expiry_date,
        "notes": data.notes,
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

@router.get("/{patient_medicine_id}")
async def get_patient_medicine(patient_medicine_id: str):
    """Get a specific patient medicine record"""
    
    medicine = await database.db.patient_medicines.find_one({
        "_id": ObjectId(patient_medicine_id)
    })
    if not medicine:
        raise HTTPException(status_code=404, detail="Patient medicine not found")
    medicine["_id"] = str(medicine["_id"])
    return medicine

@router.put("/{patient_medicine_id}")
async def update_patient_medicine(
    patient_medicine_id: str,
    data: PatientMedicineUpdate
):
    """Update patient medicine details"""
    
    update_data = data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    
    result = await database.db.patient_medicines.update_one(
        {"_id": ObjectId(patient_medicine_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient medicine not found")
    
    updated = await database.db.patient_medicines.find_one({
        "_id": ObjectId(patient_medicine_id)
    })
    updated["_id"] = str(updated["_id"])
    return updated

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

@router.get("/")
async def get_all_assigned_medicines(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[str] = None  # ✅ Now Optional is defined
):
    """Get all assigned medicines (admin view)"""
    
    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    
    cursor = database.db.patient_medicines.find(query).skip(skip).limit(limit).sort("created_at", -1)
    medicines = await cursor.to_list(length=limit)
    
    for med in medicines:
        med["_id"] = str(med["_id"])
    
    return medicines