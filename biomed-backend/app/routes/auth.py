from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from ..database.mongodb import database
from ..models.patient import Patient, Address
from ..schemas.auth import UserRegister, UserLogin, TokenResponse
from ..utils.security import get_password_hash, verify_password, create_access_token
from typing import Optional

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """Register a new user"""
    # Check if email already exists
    existing = await database.db.patients.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Generate patient ID
    count = await database.db.patients.count_documents({})
    patient_id = f"PAT-{str(count + 1).zfill(6)}"
    
    # Create patient
    patient = Patient(
        patient_id=patient_id,
        full_name=user_data.full_name,
        date_of_birth=datetime.strptime(user_data.date_of_birth, "%Y-%m-%d"),
        gender=user_data.gender,
        phone=user_data.phone,
        email=user_data.email,
        address=Address(**user_data.address),
        allergies=[],
        medical_notes=None,
        has_biometric=False
    )
    
    # Insert into database
    patient_dict = patient.dict(by_alias=True)
    patient_dict["password_hash"] = get_password_hash(user_data.password)
    
    result = await database.db.patients.insert_one(patient_dict)
    patient_dict["_id"] = str(result.inserted_id)
    
    # Create token
    access_token = create_access_token(
        data={"sub": patient.email, "patient_id": patient.patient_id}
    )
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient.patient_id
    )

@router.post("/login", response_model=TokenResponse)
async def login_user(user_data: UserLogin):
    """Login user with email and password"""
    # Find user
    patient = await database.db.patients.find_one({"email": user_data.email})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Verify password
    if not verify_password(user_data.password, patient["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create token
    access_token = create_access_token(
        data={"sub": patient["email"], "patient_id": patient["patient_id"]}
    )
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient["patient_id"]
    )