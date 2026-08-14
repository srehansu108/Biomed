from fastapi import APIRouter, HTTPException, status
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import logging

from app.database.mongodb import database
from app.models.medicine import Medicine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/medicines", tags=["Medicines"])

# ============================================
# GET ALL MEDICINES - PUBLIC
# ============================================
@router.get("/")
async def get_all_medicines(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all medicines with pagination and filtering - PUBLIC"""
    
    try:
        query = {}
        
        if category:
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"manufacturer": {"$regex": search, "$options": "i"}}
            ]
        
        total = await database.db.medicines.count_documents(query)
        logger.info(f"📊 Total medicines found: {total}")
        
        cursor = database.db.medicines.find(query).skip(skip).limit(limit)
        medicines = await cursor.to_list(length=limit)
        
        for medicine in medicines:
            medicine["_id"] = str(medicine["_id"])
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "data": medicines
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching medicines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch medicines: {str(e)}"
        )


# ============================================
# GET AVAILABLE MEDICINES - PUBLIC (NEW)
# ============================================
@router.get("/available")
async def get_available_medicines(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all medicines with stock available (quantity > 0) - PUBLIC"""
    
    try:
        query = {"quantity": {"$gt": 0}}
        
        if category:
            query["category"] = category
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"manufacturer": {"$regex": search, "$options": "i"}}
            ]
        
        total = await database.db.medicines.count_documents(query)
        logger.info(f"📊 Total available medicines found: {total}")
        
        cursor = database.db.medicines.find(query).skip(skip).limit(limit)
        medicines = await cursor.to_list(length=limit)
        
        for medicine in medicines:
            medicine["_id"] = str(medicine["_id"])
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "data": medicines
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching available medicines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch available medicines: {str(e)}"
        )


# ============================================
# GET MEDICINE BY ID - PUBLIC
# ============================================
@router.get("/{medicine_id}")
async def get_medicine(medicine_id: str):
    """Get a specific medicine by ID - PUBLIC"""
    
    try:
        medicine = await database.db.medicines.find_one(
            {"medicine_id": medicine_id}
        )
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        medicine["_id"] = str(medicine["_id"])
        return medicine
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch medicine: {str(e)}"
        )


# ============================================
# CREATE MEDICINE - PUBLIC
# ============================================
@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_medicine(medicine: Medicine):
    """Create a new medicine - PUBLIC"""
    
    try:
        logger.info(f"📦 Received medicine data: {medicine.dict()}")
        
        # Validate required fields
        if not medicine.name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Medicine name is required"
            )
        if not medicine.category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category is required"
            )
        if not medicine.manufacturer:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Manufacturer is required"
            )
        if not medicine.batch_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch number is required"
            )
        
        # Check if medicine already exists
        existing = await database.db.medicines.find_one({
            "name": medicine.name,
            "manufacturer": medicine.manufacturer
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Medicine '{medicine.name}' by '{medicine.manufacturer}' already exists"
            )
        
        # Convert to dict
        medicine_dict = medicine.dict(by_alias=True)
        
        if '_id' in medicine_dict:
            del medicine_dict['_id']
        
        # Auto-generate medicine_id if not provided
        if not medicine_dict.get("medicine_id"):
            count = await database.db.medicines.count_documents({})
            medicine_dict["medicine_id"] = f"MED-{str(count + 1).zfill(6)}"
        
        now = datetime.utcnow()
        medicine_dict["created_at"] = now
        medicine_dict["updated_at"] = now
        
        # Remove empty string values for optional fields
        if medicine_dict.get("expiry_date") == "":
            medicine_dict["expiry_date"] = None
        
        result = await database.db.medicines.insert_one(medicine_dict)
        medicine_dict["_id"] = str(result.inserted_id)
        
        logger.info(f"✅ Medicine created: {medicine.name} (ID: {medicine_dict['medicine_id']})")
        return medicine_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create medicine: {str(e)}"
        )


# ============================================
# UPDATE MEDICINE - PUBLIC
# ============================================
@router.put("/{medicine_id}")
async def update_medicine(
    medicine_id: str,
    medicine: Medicine
):
    """Update an existing medicine - PUBLIC"""
    
    try:
        existing = await database.db.medicines.find_one(
            {"medicine_id": medicine_id}
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        medicine_dict = medicine.dict(by_alias=True)
        medicine_dict.pop("_id", None)
        medicine_dict.pop("medicine_id", None)
        medicine_dict["updated_at"] = datetime.utcnow()
        
        await database.db.medicines.update_one(
            {"medicine_id": medicine_id},
            {"$set": medicine_dict}
        )
        
        updated = await database.db.medicines.find_one(
            {"medicine_id": medicine_id}
        )
        updated["_id"] = str(updated["_id"])
        
        logger.info(f"✅ Medicine updated: {medicine_id}")
        return updated
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update medicine: {str(e)}"
        )


# ============================================
# DELETE MEDICINE - PUBLIC
# ============================================
@router.delete("/{medicine_id}")
async def delete_medicine(medicine_id: str):
    """Delete a medicine - PUBLIC"""
    
    try:
        existing = await database.db.medicines.find_one(
            {"medicine_id": medicine_id}
        )
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Medicine not found"
            )
        
        result = await database.db.medicines.delete_one(
            {"medicine_id": medicine_id}
        )
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete medicine"
            )
        
        logger.info(f"✅ Medicine deleted: {medicine_id}")
        return {"message": "Medicine deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting medicine: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete medicine: {str(e)}"
        )


# ============================================
# GET LOW STOCK MEDICINES - PUBLIC
# ============================================
@router.get("/low-stock/{threshold}")
async def get_low_stock_medicines(
    threshold: int = 50
):
    """Get medicines with quantity below threshold - PUBLIC"""
    
    try:
        cursor = database.db.medicines.find(
            {"quantity": {"$lt": threshold}}
        ).sort("quantity", 1)
        
        medicines = await cursor.to_list(length=100)
        
        for medicine in medicines:
            medicine["_id"] = str(medicine["_id"])
        
        return {
            "total": len(medicines),
            "threshold": threshold,
            "data": medicines
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching low stock medicines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch low stock medicines: {str(e)}"
        )


# ============================================
# GET CATEGORIES - PUBLIC
# ============================================
@router.get("/categories/")
async def get_categories():
    """Get all medicine categories - PUBLIC"""
    
    try:
        categories = await database.db.medicines.distinct("category")
        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"❌ Error fetching categories: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch categories: {str(e)}"
        )