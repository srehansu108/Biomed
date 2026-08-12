from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from ..database.mongodb import database

# ✅ Create the router object
router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("/")
async def get_all_sales(skip: int = 0, limit: int = 100):
    """Get all sales"""
    cursor = database.db.sales.find().skip(skip).limit(limit)
    sales = await cursor.to_list(length=limit)
    return sales

@router.post("/")
async def create_sale(sale_data: dict):
    """Create a new sale"""
    # Generate sale ID if not provided
    if "sale_id" not in sale_data:
        count = await database.db.sales.count_documents({})
        sale_data["sale_id"] = f"SALE-{str(count + 1).zfill(6)}"
    
    sale_data["created_at"] = datetime.now()
    result = await database.db.sales.insert_one(sale_data)
    return {**sale_data, "_id": str(result.inserted_id)}

@router.get("/{sale_id}")
async def get_sale(sale_id: str):
    """Get sale by ID"""
    sale = await database.db.sales.find_one({"sale_id": sale_id})
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale

@router.get("/patient/{patient_id}")
async def get_patient_sales(patient_id: str):
    """Get all sales for a patient"""
    sales = await database.db.sales.find({"patient_id": patient_id}).to_list(length=100)
    return sales

@router.delete("/{sale_id}")
async def delete_sale(sale_id: str):
    """Delete a sale"""
    result = await database.db.sales.delete_one({"sale_id": sale_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sale not found")
    return {"message": "Sale deleted successfully"}

@router.get("/today")
async def get_today_sales():
    """Get today's sales"""
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    sales = await database.db.sales.find({
        "created_at": {"$gte": today_start}
    }).to_list(length=100)
    return sales