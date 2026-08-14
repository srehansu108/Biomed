from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime, timezone
from ..database.mongodb import database
from ..models.patient import Patient, Address
from ..schemas.auth import UserRegister, UserLogin, TokenResponse, CheckRegistrationStatus
from ..utils.security import get_password_hash, verify_password, create_access_token
from typing import Optional
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserRegister):
    """Register a new user - Biometric registration is MANDATORY"""
    
    try:
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
        
        # ✅ FIX: Generate patient ID with proper count
        count = await database.db.patients.count_documents({})
        patient_id = f"PAT-{str(count + 1).zfill(6)}"
        
        # ✅ FIX: Parse date of birth with error handling
        try:
            dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # ✅ FIX: Create patient with correct data
        patient = Patient(
            patient_id=patient_id,
            full_name=user_data.full_name,
            date_of_birth=dob,
            gender=user_data.gender,
            phone=user_data.phone,
            email=user_data.email,
            address=Address(**user_data.address),
            allergies=[],  # Default empty list
            medical_notes=None,
            has_biometric=False,
            role="patient",
            registration_complete=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Convert to dict and add password hash
        patient_dict = patient.dict(by_alias=True)
        
        # ✅ FIX: Remove _id if present to let MongoDB generate it
        if '_id' in patient_dict:
            del patient_dict['_id']
        
        # Add password hash (Patient model doesn't have this field)
        patient_dict["password_hash"] = get_password_hash(user_data.password)
        
        # ✅ FIX: Better error handling for insert
        try:
            result = await database.db.patients.insert_one(patient_dict)
            patient_id_str = str(result.inserted_id)
            logger.info(f"✅ Patient registered successfully: {patient_id}")
        except Exception as e:
            error_msg = str(e)
            if "E11000" in error_msg or "duplicate key" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Duplicate entry. Patient ID, email, or phone already exists."
                )
            logger.error(f"❌ Registration database error: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Registration failed: {error_msg[:100]}"
            )
        
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
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration"
        )

@router.post("/login", response_model=TokenResponse)
async def login_user(user_data: UserLogin):
    """Login user with email and password"""
    
    try:
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
        
        # ✅ FIX: Update last login timestamp
        await database.db.patients.update_one(
            {"_id": patient["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
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
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )

@router.post("/complete-registration")
async def complete_registration(patient_id: str):
    """Mark registration as complete after biometric setup"""
    
    try:
        # Check if patient exists
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # ✅ FIX: Check if biometric is set
        if not patient.get("has_biometric", False):
            raise HTTPException(
                status_code=400, 
                detail="Biometric authentication must be set up first"
            )
        
        # ✅ FIX: Check if already complete
        if patient.get("registration_complete", False):
            # Return existing token
            access_token = create_access_token(
                data={
                    "sub": patient["email"],
                    "patient_id": patient_id,
                    "registration_complete": True
                }
            )
            return {
                "message": "Registration already complete",
                "access_token": access_token,
                "patient_id": patient_id,
                "registration_complete": True
            }
        
        # Mark registration as complete
        result = await database.db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "registration_complete": True, 
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Failed to update registration status"
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
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Complete registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while completing registration"
        )

@router.post("/check-registration-status")
async def check_registration_status(data: CheckRegistrationStatus):
    """Check if user has completed registration with biometrics"""
    
    try:
        patient = await database.db.patients.find_one(
            {"patient_id": data.patient_id}
        )
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        return {
            "patient_id": data.patient_id,
            "has_biometric": patient.get("has_biometric", False),
            "registration_complete": patient.get("registration_complete", False),
            "email": patient.get("email"),
            "full_name": patient.get("full_name")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Check registration status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while checking registration status"
        )