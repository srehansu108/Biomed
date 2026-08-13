from fastapi import APIRouter, HTTPException
from typing import List, Optional
from datetime import datetime
from ..database.mongodb import database
from ..models.medicine import Medicine
from ..schemas.medicine import MedicineCreate, MedicineUpdate

router = APIRouter(prefix="/medicines", tags=["Medicines"])

@router.get("/")
async def get_all_medicines(
    skip: int = 0, 
    limit: int = 100,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    """Get all medicines with optional filters"""
    query = {}
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"manufacturer": {"$regex": search, "$options": "i"}},
            {"batch_number": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = database.db.medicines.find(query).skip(skip).limit(limit)
    medicines = await cursor.to_list(length=limit)
    return medicines

@router.get("/available")
async def get_available_medicines():
    """Get all available medicines (in stock)"""
    cursor = database.db.medicines.find({
        "is_available": True, 
        "quantity": {"$gt": 0}
    }).sort("name", 1)
    medicines = await cursor.to_list(length=100)
    return medicines

@router.get("/{medicine_id}")
async def get_medicine(medicine_id: str):
    """Get medicine by ID"""
    medicine = await database.db.medicines.find_one({"medicine_id": medicine_id})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine

@router.post("/")
async def create_medicine(medicine: MedicineCreate):
    """Create a new medicine"""
    # Check if medicine already exists
    existing = await database.db.medicines.find_one({"name": medicine.name})
    if existing:
        raise HTTPException(status_code=400, detail="Medicine already exists")
    
    # Generate medicine ID
    count = await database.db.medicines.count_documents({})
    medicine_id = f"MED-{str(count + 1).zfill(6)}"
    
    medicine_dict = medicine.dict()
    medicine_dict["medicine_id"] = medicine_id
    medicine_dict["is_available"] = True
    medicine_dict["created_at"] = datetime.now()
    medicine_dict["updated_at"] = datetime.now()
    
    result = await database.db.medicines.insert_one(medicine_dict)
    medicine_dict["_id"] = str(result.inserted_id)
    
    return medicine_dict

@router.put("/{medicine_id}")
async def update_medicine(medicine_id: str, medicine: MedicineUpdate):
    """Update a medicine"""
    existing = await database.db.medicines.find_one({"medicine_id": medicine_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    update_data = medicine.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now()
    
    await database.db.medicines.update_one(
        {"medicine_id": medicine_id},
        {"$set": update_data}
    )
    
    updated = await database.db.medicines.find_one({"medicine_id": medicine_id})
    return updated

@router.delete("/{medicine_id}")
async def delete_medicine(medicine_id: str):
    """Delete a medicine"""
    result = await database.db.medicines.delete_one({"medicine_id": medicine_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"message": "Medicine deleted successfully"}

@router.patch("/{medicine_id}/stock")
async def update_stock(medicine_id: str, quantity: int):
    """Update medicine stock"""
    result = await database.db.medicines.update_one(
        {"medicine_id": medicine_id},
        {"$set": {"quantity": quantity, "updated_at": datetime.now()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return {"message": "Stock updated successfully"}

@router.get("/low-stock/{threshold}")
async def get_low_stock_medicines(threshold: int = 50):
    """Get medicines with low stock"""
    cursor = database.db.medicines.find({"quantity": {"$lte": threshold}})
    medicines = await cursor.to_list(length=100)
    return medicines

@router.get("/categories")
async def get_categories():
    """Get all unique categories"""
    categories = await database.db.medicines.distinct("category")
    return {"categories": categories}