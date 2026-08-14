from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from datetime import datetime
from ..database.mongodb import database
from ..models.prescription import Prescription, MedicineDosage
from ..models.medicine import Medicine
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])

@router.get("/")
async def get_all_prescriptions(skip: int = 0, limit: int = 100):
    """Get all prescriptions"""
    try:
        cursor = database.db.prescriptions.find().skip(skip).limit(limit).sort("created_at", -1)
        prescriptions = await cursor.to_list(length=limit)
        
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
        
        return prescriptions
    except Exception as e:
        logger.error(f"❌ Error fetching prescriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prescriptions"
        )

@router.get("/{prescription_id}")
async def get_prescription(prescription_id: str):
    """Get prescription by ID"""
    try:
        prescription = await database.db.prescriptions.find_one(
            {"prescription_id": prescription_id}
        )
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Prescription not found"
            )
        prescription["_id"] = str(prescription["_id"])
        return prescription
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching prescription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch prescription"
        )

@router.post("/")
async def create_prescription(prescription: Prescription):
    """Create a new prescription"""
    try:
        # Check if prescription ID already exists
        existing = await database.db.prescriptions.find_one(
            {"prescription_id": prescription.prescription_id}
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Prescription ID already exists"
            )
        
        # Check if patient exists
        patient = await database.db.patients.find_one(
            {"patient_id": prescription.patient_id}
        )
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Patient not found"
            )
        
        # Verify medicines exist and have stock
        for med in prescription.medicines:
            medicine = await database.db.medicines.find_one({"name": med.medicine_name})
            if not medicine:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail=f"Medicine '{med.medicine_name}' not found"
                )
            if medicine.get("quantity", 0) < med.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, 
                    detail=f"Insufficient stock for '{med.medicine_name}'. Available: {medicine.get('quantity', 0)}"
                )
        
        # ✅ FIX: Use UTC timestamps
        now = datetime.utcnow()
        prescription_dict = prescription.dict()
        prescription_dict["created_at"] = now
        prescription_dict["updated_at"] = now
        
        result = await database.db.prescriptions.insert_one(prescription_dict)
        prescription_dict["_id"] = str(result.inserted_id)
        
        logger.info(f"✅ Prescription {prescription.prescription_id} created")
        return prescription_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating prescription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create prescription: {str(e)}"
        )

@router.put("/{prescription_id}")
async def update_prescription(prescription_id: str, prescription: Prescription):
    """Update a prescription"""
    try:
        existing = await database.db.prescriptions.find_one(
            {"prescription_id": prescription_id}
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Prescription not found"
            )
        
        # ✅ FIX: Use UTC
        prescription_dict = prescription.dict()
        prescription_dict["updated_at"] = datetime.utcnow()
        
        await database.db.prescriptions.update_one(
            {"prescription_id": prescription_id},
            {"$set": prescription_dict}
        )
        
        prescription_dict["_id"] = str(existing["_id"])
        return prescription_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating prescription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prescription"
        )

@router.delete("/{prescription_id}")
async def delete_prescription(prescription_id: str):
    """Delete a prescription"""
    try:
        result = await database.db.prescriptions.delete_one(
            {"prescription_id": prescription_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Prescription not found"
            )
        return {"message": "Prescription deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting prescription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete prescription"
        )

@router.get("/patient/{patient_id}")
async def get_patient_prescriptions(patient_id: str):
    """Get all prescriptions for a patient"""
    try:
        prescriptions = await database.db.prescriptions.find(
            {"patient_id": patient_id}
        ).sort("created_at", -1).to_list(length=100)
        
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
        
        return prescriptions
        
    except Exception as e:
        logger.error(f"❌ Error fetching patient prescriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient prescriptions"
        )

@router.patch("/{prescription_id}/status")
async def update_prescription_status(prescription_id: str, status: str):
    """Update prescription status"""
    try:
        valid_statuses = ["active", "dispensed", "expired", "cancelled"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        
        # ✅ FIX: Use UTC
        result = await database.db.prescriptions.update_one(
            {"prescription_id": prescription_id},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Prescription not found"
            )
        
        return {"message": f"Prescription status updated to {status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating prescription status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update prescription status"
        )

@router.post("/{prescription_id}/dispense")
async def dispense_prescription(prescription_id: str):
    """Dispense a prescription (decrease medicine stock)"""
    try:
        # Get prescription
        prescription = await database.db.prescriptions.find_one(
            {"prescription_id": prescription_id}
        )
        if not prescription:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Prescription not found"
            )
        
        if prescription["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Prescription is not active"
            )
        
        # Update stock for each medicine
        for med in prescription["medicines"]:
            result = await database.db.medicines.update_one(
                {"name": med["medicine_name"]},
                {"$inc": {"quantity": -med["quantity"]}}
            )
            if result.matched_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND, 
                    detail=f"Medicine '{med['medicine_name']}' not found"
                )
        
        # Update prescription status
        # ✅ FIX: Use UTC
        await database.db.prescriptions.update_one(
            {"prescription_id": prescription_id},
            {"$set": {"status": "dispensed", "updated_at": datetime.utcnow()}}
        )
        
        return {
            "message": "Prescription dispensed successfully",
            "prescription_id": prescription_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error dispensing prescription: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to dispense prescription"
        )