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
    """Register a new user - Biometric registration is MANDATORY"""
    
    # Check if email already exists
    existing = await database.db.patients.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if phone already exists
    existing_phone = await database.db.patients.find_one({"phone": user_data.phone})
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    
    # Generate patient ID
    count = await database.db.patients.count_documents({})
    patient_id = f"PAT-{str(count + 1).zfill(6)}"
    
    # Create patient with biometric flag set to False initially
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
        has_biometric=False,
        role="patient"
    )
    
    # Insert into database
    patient_dict = patient.dict(by_alias=True)
    patient_dict["password_hash"] = get_password_hash(user_data.password)
    patient_dict["registration_complete"] = False
    
    result = await database.db.patients.insert_one(patient_dict)
    patient_dict["_id"] = str(result.inserted_id)
    
    # Create token with incomplete registration flag
    access_token = create_access_token(
        data={
            "sub": patient.email, 
            "patient_id": patient.patient_id,
            "registration_complete": False
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient.patient_id,
        registration_complete=False
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
        data={
            "sub": patient["email"],
            "patient_id": patient["patient_id"],
            "registration_complete": patient.get("registration_complete", False)
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient["patient_id"],
        registration_complete=patient.get("registration_complete", False)
    )

@router.post("/complete-registration")
async def complete_registration(patient_id: str):
    """Mark registration as complete after biometric setup"""
    
    # Check if patient exists
    patient = await database.db.patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if biometric is set
    if not patient.get("has_biometric", False):
        raise HTTPException(
            status_code=400, 
            detail="Biometric authentication must be set up first"
        )
    
    # Mark registration as complete
    await database.db.patients.update_one(
        {"patient_id": patient_id},
        {"$set": {"registration_complete": True, "updated_at": datetime.now()}}
    )
    
    # Generate new token with complete flag
    access_token = create_access_token(
        data={
            "sub": patient["email"],
            "patient_id": patient_id,
            "registration_complete": True
        }
    )
    
    return {
        "message": "Registration completed successfully",
        "access_token": access_token,
        "patient_id": patient_id,
        "registration_complete": True
    }

@router.post("/check-registration-status")
async def check_registration_status(data: dict):
    """Check if user has completed registration with biometrics"""
    
    patient_id = data.get("patient_id")
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id is required")
    
    patient = await database.db.patients.find_one({"patient_id": patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return {
        "has_biometric": patient.get("has_biometric", False),
        "registration_complete": patient.get("registration_complete", False)
    }