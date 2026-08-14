from fastapi import APIRouter, HTTPException, status, Query
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import logging

from app.database.mongodb import database
from app.models.patient import Patient, Address
from app.schemas.auth import UserRegister as UserRegistration, UserResponse, CheckRegistrationStatus
from app.utils.security import get_password_hash, create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patients", tags=["Patients"])

# ============================================
# REGISTER NEW PATIENT
# ============================================
@router.post("/register", response_model=UserResponse)
async def register_patient(user_data: UserRegistration):
    """Register a new patient in the system"""
    
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
        
        # Generate unique patient ID
        count = await database.db.patients.count_documents({})
        patient_id = f"PAT-{str(count + 1).zfill(6)}"
        
        # Parse date of birth
        try:
            dob = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Create Address object
        address = Address(
            street=user_data.address.get("street", ""),
            city=user_data.address.get("city", ""),
            state=user_data.address.get("state", ""),
            pincode=user_data.address.get("pincode", ""),
            country=user_data.address.get("country", "India")
        )
        
        # Create Patient object
        patient = Patient(
            patient_id=patient_id,
            full_name=user_data.full_name,
            date_of_birth=dob,
            gender=user_data.gender,
            phone=user_data.phone,
            email=user_data.email,
            address=address,
            allergies=user_data.allergies or [],
            medical_notes=user_data.medical_notes,
            has_biometric=False,
            role="patient",
            registration_complete=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Convert to dict
        patient_dict = patient.dict(by_alias=True)
        
        # Remove _id to let MongoDB generate it
        if '_id' in patient_dict:
            del patient_dict['_id']
        
        # Add password hash if password is provided
        if hasattr(user_data, 'password') and user_data.password:
            patient_dict["password_hash"] = get_password_hash(user_data.password)
        
        # Insert into database
        try:
            result = await database.db.patients.insert_one(patient_dict)
            inserted_id = str(result.inserted_id)
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
        
        # Return response
        return UserResponse(
            id=inserted_id,
            patient_id=patient_id,
            full_name=user_data.full_name,
            email=user_data.email,
            phone=user_data.phone,
            registration_complete=False,
            message="Patient registered successfully. Please complete biometric setup."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during registration"
        )


# ============================================
# GET ALL PATIENTS - PUBLIC
# ============================================
@router.get("/")
async def get_all_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None
):
    """Get all patients with pagination and search - PUBLIC"""
    
    try:
        # Build query
        query = {}
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"patient_id": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await database.db.patients.count_documents(query)
        
        # Get patients
        cursor = database.db.patients.find(query).skip(skip).limit(limit)
        patients = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string
        for patient in patients:
            patient["_id"] = str(patient["_id"])
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "patients": patients
        }
        
    except Exception as e:
        logger.error(f"❌ Error fetching patients: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patients"
        )


# ============================================
# GET PATIENT BY ID - PUBLIC
# ============================================
@router.get("/{patient_id}")
async def get_patient(patient_id: str):
    """Get patient by patient_id - PUBLIC"""
    
    try:
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Convert ObjectId to string
        patient["_id"] = str(patient["_id"])
        
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching patient {patient_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient"
        )


# ============================================
# UPDATE PATIENT - PUBLIC
# ============================================
@router.put("/{patient_id}")
async def update_patient(
    patient_id: str,
    update_data: dict
):
    """Update patient information - PUBLIC"""
    
    try:
        # Check if patient exists
        existing = await database.db.patients.find_one({"patient_id": patient_id})
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Remove fields that shouldn't be updated
        update_data.pop("_id", None)
        update_data.pop("patient_id", None)
        update_data.pop("password_hash", None)
        
        # Add updated timestamp
        update_data["updated_at"] = datetime.utcnow()
        
        # Update patient
        result = await database.db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            return {"message": "No changes made", "patient_id": patient_id}
        
        # Get updated patient
        updated = await database.db.patients.find_one({"patient_id": patient_id})
        updated["_id"] = str(updated["_id"])
        
        return {
            "message": "Patient updated successfully",
            "patient": updated
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating patient {patient_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient"
        )


# ============================================
# DELETE PATIENT - PUBLIC
# ============================================
@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient - PUBLIC"""
    
    try:
        # Check if patient exists
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Delete patient
        result = await database.db.patients.delete_one({"patient_id": patient_id})
        
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete patient"
            )
        
        return {
            "message": "Patient deleted successfully",
            "patient_id": patient_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting patient {patient_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete patient"
        )


# ============================================
# GET PATIENT BY EMAIL - PUBLIC
# ============================================
@router.get("/email/{email}")
async def get_patient_by_email(email: str):
    """Get patient by email address - PUBLIC"""
    
    try:
        patient = await database.db.patients.find_one({"email": email})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        patient["_id"] = str(patient["_id"])
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching patient by email {email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch patient"
        )


# ============================================
# CHECK REGISTRATION STATUS - PUBLIC
# ============================================
@router.post("/check-registration-status")
async def check_registration_status(data: CheckRegistrationStatus):
    """Check if patient has completed registration with biometrics - PUBLIC"""
    
    try:
        patient = await database.db.patients.find_one(
            {"patient_id": data.patient_id}
        )
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
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
        logger.error(f"❌ Error checking registration status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check registration status"
        )


# ============================================
# COMPLETE REGISTRATION - PUBLIC
# ============================================
@router.post("/{patient_id}/complete-registration")
async def complete_patient_registration(patient_id: str):
    """Mark patient registration as complete after biometric setup - PUBLIC"""
    
    try:
        # Check if patient exists
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Check if biometric is set
        if not patient.get("has_biometric", False):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Biometric authentication must be set up first"
            )
        
        # Check if already complete
        if patient.get("registration_complete", False):
            return {
                "message": "Registration already complete",
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
                status_code=status.HTTP_400_BAD_REQUEST,
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
        logger.error(f"❌ Error completing registration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete registration"
        )


# ============================================
# UPDATE BIOMETRIC STATUS - PUBLIC
# ============================================
@router.patch("/{patient_id}/biometric")
async def update_biometric_status(
    patient_id: str,
    has_biometric: bool
):
    """Update patient's biometric status - PUBLIC"""
    
    try:
        # Check if patient exists
        patient = await database.db.patients.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Update biometric status
        result = await database.db.patients.update_one(
            {"patient_id": patient_id},
            {"$set": {
                "has_biometric": has_biometric,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count == 0:
            return {
                "message": "No changes made",
                "patient_id": patient_id,
                "has_biometric": patient.get("has_biometric", False)
            }
        
        return {
            "message": f"Biometric status updated to {has_biometric}",
            "patient_id": patient_id,
            "has_biometric": has_biometric
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating biometric status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update biometric status"
        )