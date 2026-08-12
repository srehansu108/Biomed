from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
from webauthn.helpers import parse_authentication_credential_json, parse_registration_credential_json
from webauthn.helpers.structs import (
    RegistrationCredential, AuthenticationCredential,
    AuthenticatorSelectionCriteria, UserVerificationRequirement
)
from ..schemas.auth import (
    WebAuthnRegistrationOptions, WebAuthnRegistrationVerify,
    WebAuthnLoginOptions, WebAuthnLoginVerify,
    TokenResponse
)
from ..database.mongodb import database
from ..config import settings
from ..utils.security import create_access_token
from bson import ObjectId
import base64
import json
from datetime import datetime

router = APIRouter(prefix="/webauthn", tags=["WebAuthn"])

def to_base64url(data: bytes) -> str:
    """Convert bytes to base64url string without padding"""
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def from_base64url(data: str) -> bytes:
    """Convert base64url string to bytes"""
    # Add padding if needed
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    # Replace URL-safe characters
    data = data.replace("-", "+").replace("_", "/")
    return base64.b64decode(data)

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, bytes):
            return to_base64url(obj)
        if isinstance(obj, bytearray):
            return to_base64url(bytes(obj))
        return super().default(obj)

@router.post("/register/options")
async def get_registration_options(data: WebAuthnRegistrationOptions):
    """Get WebAuthn registration options with mandatory biometrics"""
    
    # Check if user exists
    patient = await database.db.patients.find_one({"email": data.email})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if user already has biometric
    if patient.get("has_biometric", False):
        raise HTTPException(
            status_code=400, 
            detail="Biometric already registered for this user"
        )
    
    # Generate options with MANDATORY biometrics
    options = generate_registration_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=patient["patient_id"].encode(),
        user_name=data.email,
        user_display_name=patient["full_name"],
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment="platform",
            resident_key="required",
            user_verification=UserVerificationRequirement.REQUIRED
        ),
        attestation="none",
        timeout=60000
    )
    
    # Store challenge with longer expiry (10 minutes)
    challenge_data = {
        "challenge": options.challenge,
        "email": data.email,
        "patient_id": patient["patient_id"],
        "created_at": datetime.now(),
        "expires_at": datetime.now().timestamp() + 600  # 10 minutes
    }
    result = await database.db.webauthn_challenges.insert_one(challenge_data)
    challenge_id = str(result.inserted_id)
    
    # Build response with proper serialization
    response_data = {
        "challenge": to_base64url(options.challenge),
        "challengeId": challenge_id,
        "rp": {
            "id": str(options.rp.id),
            "name": str(options.rp.name)
        },
        "user": {
            "id": to_base64url(patient["patient_id"].encode()),
            "name": str(options.user.name),
            "displayName": str(options.user.display_name)
        },
        "pubKeyCredParams": [],
        "authenticatorSelection": {
            "authenticatorAttachment": str(options.authenticator_selection.authenticator_attachment),
            "residentKey": str(options.authenticator_selection.resident_key),
            "userVerification": str(options.authenticator_selection.user_verification)
        },
        "timeout": int(options.timeout),
        "attestation": str(options.attestation)
    }
    
    # Add pubKeyCredParams safely
    for param in options.pub_key_cred_params:
        try:
            alg_value = int(param.alg) if isinstance(param.alg, (int, str)) else int.from_bytes(param.alg, byteorder='big')
        except:
            alg_value = -7  # Default to ES256
        response_data["pubKeyCredParams"].append({
            "type": str(param.type),
            "alg": alg_value
        })
    
    # Serialize to JSON string with custom encoder
    json_str = json.dumps(response_data, cls=CustomJSONEncoder)
    
    # Return as plain text response
    return PlainTextResponse(content=json_str, media_type="application/json")

@router.post("/register/verify")
async def verify_registration(data: WebAuthnRegistrationVerify):
    """Verify WebAuthn registration - COMPLETES BIOMETRIC SETUP"""
    
    # Get the challenge ID from the credential
    challenge_id = data.credential.get("challenge_id")
    
    # If challenge_id is provided, use it; otherwise try to find by email
    if challenge_id:
        try:
            challenge_doc = await database.db.webauthn_challenges.find_one({
                "_id": ObjectId(challenge_id)
            })
        except:
            challenge_doc = None
    else:
        # Fallback: find the most recent challenge for this email
        challenge_doc = await database.db.webauthn_challenges.find_one(
            {"email": data.email},
            sort=[("created_at", -1)]
        )
    
    if not challenge_doc:
        raise HTTPException(
            status_code=400, 
            detail="No challenge found. Please try again."
        )
    
    # Check if challenge expired
    if datetime.now().timestamp() > challenge_doc.get("expires_at", 0):
        await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        raise HTTPException(
            status_code=400, 
            detail="Challenge expired. Please try again."
        )
    
    try:
        # Get credential data
        credential_data = data.credential
        
        # Remove challenge_id from credential data (not needed for validation)
        credential_data.pop("challenge_id", None)
        
        # ✅ Use parse_registration_credential_json instead of model_validate
        # First, convert the credential to JSON
        credential_json = json.dumps(credential_data)
        
        # Parse using the helper function
        credential = parse_registration_credential_json(credential_json)
        
        # Verify the registration response
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge_doc["challenge"],
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")
    
    # Store credential
    credential_store = {
        "credential_id": base64.b64encode(verification.credential_id).decode('utf-8'),
        "patient_id": challenge_doc["patient_id"],
        "public_key": verification.credential_public_key,
        "sign_count": verification.sign_count,
        "created_at": datetime.now(),
        "last_used": datetime.now()
    }
    await database.db.webauthn_credentials.insert_one(credential_store)
    
    # Update patient with biometric flag
    patient_id = challenge_doc["patient_id"]
    await database.db.patients.update_one(
        {"patient_id": patient_id},
        {"$set": {
            "has_biometric": True,
            "registration_complete": True,
            "updated_at": datetime.now()
        }}
    )
    
    # Clean up challenge
    await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
    
    # Generate new token with complete flag
    patient = await database.db.patients.find_one({"patient_id": patient_id})
    access_token = create_access_token(
        data={
            "sub": patient["email"],
            "patient_id": patient_id,
            "registration_complete": True
        }
    )
    
    return {
        "success": True,
        "message": "Biometric registered successfully",
        "access_token": access_token,
        "patient_id": patient_id,
        "registration_complete": True
    }

@router.post("/login/options")
async def get_login_options(data: WebAuthnLoginOptions):
    """Get WebAuthn login options"""
    
    # Check if user exists
    patient = await database.db.patients.find_one({"email": data.email})
    if not patient:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user has completed registration
    if not patient.get("registration_complete", False):
        raise HTTPException(
            status_code=400, 
            detail="User has not completed biometric registration"
        )
    
    # Check if user has biometric
    if not patient.get("has_biometric", False):
        raise HTTPException(
            status_code=400, 
            detail="User has no biometric registered"
        )
    
    # Get credential
    credential = await database.db.webauthn_credentials.find_one({
        "patient_id": patient["patient_id"]
    })
    if not credential:
        raise HTTPException(status_code=400, detail="No credential found")
    
    # Generate options
    options = generate_authentication_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        timeout=60000,
        user_verification=UserVerificationRequirement.REQUIRED
    )
    
    # Store challenge
    challenge_data = {
        "challenge": options.challenge,
        "email": data.email,
        "patient_id": patient["patient_id"],
        "created_at": datetime.now(),
        "expires_at": datetime.now().timestamp() + 600
    }
    result = await database.db.webauthn_challenges.insert_one(challenge_data)
    challenge_id = str(result.inserted_id)
    
    # Return options as dictionary with proper serialization
    response_data = {
        "challenge": to_base64url(options.challenge),
        "challengeId": challenge_id,
        "rpId": str(options.rp_id),
        "timeout": int(options.timeout),
        "userVerification": str(options.user_verification)
    }
    
    # Serialize to JSON string
    json_str = json.dumps(response_data, cls=CustomJSONEncoder)
    
    # Return as plain text response
    return PlainTextResponse(content=json_str, media_type="application/json")

@router.post("/login/verify")
async def verify_login(data: WebAuthnLoginVerify):
    """Verify WebAuthn login"""
    
    # Get challenge ID from credential
    challenge_id = data.credential.get("challenge_id")
    
    if challenge_id:
        try:
            challenge_doc = await database.db.webauthn_challenges.find_one({
                "_id": ObjectId(challenge_id)
            })
        except:
            challenge_doc = None
    else:
        challenge_doc = await database.db.webauthn_challenges.find_one(
            {"email": data.email},
            sort=[("created_at", -1)]
        )
    
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No challenge found")
    
    # Check if challenge expired
    if datetime.now().timestamp() > challenge_doc.get("expires_at", 0):
        await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
        raise HTTPException(status_code=400, detail="Challenge expired. Please try again.")
    
    # Get credential
    credential = await database.db.webauthn_credentials.find_one({
        "patient_id": challenge_doc["patient_id"]
    })
    if not credential:
        raise HTTPException(status_code=400, detail="No credential found")
    
    try:
        # Get credential data
        credential_data = data.credential
        credential_data.pop("challenge_id", None)
        
        # ✅ Use parse_authentication_credential_json
        credential_json = json.dumps(credential_data)
        auth_credential = parse_authentication_credential_json(credential_json)
        
        verification = verify_authentication_response(
            credential=auth_credential,
            expected_challenge=challenge_doc["challenge"],
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN,
            credential_public_key=credential["public_key"],
            credential_current_sign_count=credential["sign_count"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Verification failed: {str(e)}")
    
    # Update sign count
    await database.db.webauthn_credentials.update_one(
        {"_id": credential["_id"]},
        {"$set": {"sign_count": verification.new_sign_count, "last_used": datetime.now()}}
    )
    
    # Get patient
    patient = await database.db.patients.find_one({"patient_id": challenge_doc["patient_id"]})
    
    # Create token
    access_token = create_access_token(
        data={
            "sub": patient["email"],
            "patient_id": patient["patient_id"],
            "registration_complete": True
        }
    )
    
    # Clean up challenge
    await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient["patient_id"],
        registration_complete=True
    )