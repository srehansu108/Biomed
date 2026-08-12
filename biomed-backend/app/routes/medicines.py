from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from ..database.mongodb import database
from ..models.medicine import Medicine

router = APIRouter(prefix="/medicines", tags=["Medicines"])

@router.get("/")
async def get_all_medicines():
    """Get all medicines"""
    medicines = await database.db.medicines.find().to_list(length=1000)
    return medicines

@router.post("/")
async def create_medicine(medicine: Medicine):
    """Create a new medicine"""
    # Check if medicine ID exists
    existing = await database.db.medicines.find_one({"medicine_id": medicine.medicine_id})
    if existing:
        raise HTTPException(status_code=400, detail="Medicine ID already exists")
    
    result = await database.db.medicines.insert_one(medicine.dict())
    return {**medicine.dict(), "_id": str(result.inserted_id)}

@router.get("/low-stock")
async def get_low_stock_medicines(threshold: int = 50):
    """Get medicines with low stock"""
    medicines = await database.db.medicines.find({"quantity": {"$lt": threshold}}).to_list(length=100)
    return medicines

@router.get("/expiring")
async def get_expiring_medicines(days: int = 90):
    """Get medicines expiring within N days"""
    from datetime import datetime, timedelta
    expiry_date = datetime.now() + timedelta(days=days)
    medicines = await database.db.medicines.find({
        "expiry_date": {"$lte": expiry_date}
    }).to_list(length=100)
    return medicines