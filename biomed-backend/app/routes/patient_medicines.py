from fastapi import APIRouter, HTTPException, Depends, status
from typing import Optional
from datetime import datetime
from bson import ObjectId
import logging

from app.database.mongodb import database
from app.schemas.patient_medicine import PatientMedicineCreate, PatientMedicineUpdate
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

# ✅ FIX: Added prefix="/patient-medicines"
router = APIRouter(prefix="/patient-medicines", tags=["Patient Medicines"])

@router.post("/")
async def assign_medicine_to_patient(
    data: PatientMedicineCreate,
    current_user: dict = Depends(get_current_user)
):
    """Admin assigns/prescribes medicine to a patient"""
    
    try:
        # Check if patient exists
        patient = await database.db.patients.find_one({"patient_id": data.patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient not found"
            )
        
        # Check if medicine exists
        medicine = await database.db.medicines.find_one({"medicine_id": data.medicine_id})
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Medicine not found"
            )
        
        # Check if already assigned
        existing = await database.db.patient_medicines.find_one({
            "patient_id": data.patient_id,
            "medicine_id": data.medicine_id,
            "status": "active"
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This medicine is already assigned to the patient"
            )
        
        now = datetime.utcnow()
        
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
            "prescribed_date": now,
            "expiry_date": data.expiry_date,
            "notes": data.notes,
            "requires_prescription": True,
            "created_at": now,
            "updated_at": now
        }
        
        result = await database.db.patient_medicines.insert_one(patient_medicine)
        patient_medicine["_id"] = str(result.inserted_id)
        
        logger.info(f"✅ Medicine {data.medicine_name} assigned to patient {data.patient_id}")
        return patient_medicine
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error assigning medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign medicine: {str(e)}"
        )

@router.get("/patient/{patient_id}")
async def get_patient_medicines(patient_id: str):
    """Get all medicines assigned to a specific patient"""
    
    try:
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        cursor = database.db.patient_medicines.find(
            {"patient_id": patient_id}
        ).sort("created_at", -1)
        
        medicines = await cursor.to_list(length=100)
        
        for med in medicines:
            med["_id"] = str(med["_id"])
        
        return medicines
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching patient medicines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient medicines"
        )

@router.get("/{patient_medicine_id}")
async def get_patient_medicine(patient_medicine_id: str):
    """Get a specific patient medicine record"""
    
    try:
        if not ObjectId.is_valid(patient_medicine_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
        
        medicine = await database.db.patient_medicines.find_one({
            "_id": ObjectId(patient_medicine_id)
        })
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient medicine not found"
            )
        
        medicine["_id"] = str(medicine["_id"])
        return medicine
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching patient medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient medicine"
        )

@router.put("/{patient_medicine_id}")
async def update_patient_medicine(
    patient_medicine_id: str,
    data: PatientMedicineUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update patient medicine details"""
    
    try:
        if not ObjectId.is_valid(patient_medicine_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
        
        update_data = data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        result = await database.db.patient_medicines.update_one(
            {"_id": ObjectId(patient_medicine_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient medicine not found"
            )
        
        updated = await database.db.patient_medicines.find_one({
            "_id": ObjectId(patient_medicine_id)
        })
        updated["_id"] = str(updated["_id"])
        return updated
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating patient medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient medicine"
        )

@router.patch("/{patient_medicine_id}/consume")
async def consume_medicine(
    patient_medicine_id: str, 
    quantity: int = 1,
    current_user: dict = Depends(get_current_user)
):
    """Patient consumes medicine (decrease remaining quantity)"""
    
    try:
        if not ObjectId.is_valid(patient_medicine_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
        
        if quantity <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity must be greater than 0"
            )
        
        medicine = await database.db.patient_medicines.find_one({
            "_id": ObjectId(patient_medicine_id)
        })
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient medicine not found"
            )
        
        if medicine["remaining_quantity"] < quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Insufficient remaining quantity. Available: {medicine['remaining_quantity']}"
            )
        
        new_remaining = medicine["remaining_quantity"] - quantity
        
        await database.db.patient_medicines.update_one(
            {"_id": ObjectId(patient_medicine_id)},
            {"$set": {
                "remaining_quantity": new_remaining,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if new_remaining == 0:
            await database.db.patient_medicines.update_one(
                {"_id": ObjectId(patient_medicine_id)},
                {"$set": {"status": "completed"}}
            )
        
        return {
            "message": f"Consumed {quantity} unit(s)", 
            "remaining": new_remaining,
            "status": "completed" if new_remaining == 0 else "active"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error consuming medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to consume medicine"
        )

@router.delete("/{patient_medicine_id}")
async def remove_patient_medicine(
    patient_medicine_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a medicine from patient's list"""
    
    try:
        if not ObjectId.is_valid(patient_medicine_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID format"
            )
        
        result = await database.db.patient_medicines.delete_one({
            "_id": ObjectId(patient_medicine_id)
        })
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient medicine not found"
            )
        
        return {"message": "Medicine removed from patient's list"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error removing patient medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove patient medicine"
        )

@router.get("/")
async def get_all_assigned_medicines(
    skip: int = 0,
    limit: int = 100,
    patient_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all assigned medicines (admin view)"""
    
    try:
        query = {}
        if patient_id:
            query["patient_id"] = patient_id
        
        cursor = database.db.patient_medicines.find(query).skip(skip).limit(limit).sort("created_at", -1)
        medicines = await cursor.to_list(length=limit)
        
        for med in medicines:
            med["_id"] = str(med["_id"])
        
        return medicines
        
    except Exception as e:
        logger.error(f"❌ Error fetching all assigned medicines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch assigned medicines"
        )