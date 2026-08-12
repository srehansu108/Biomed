from fastapi import APIRouter, HTTPException, Depends
from webauthn import generate_registration_options, verify_registration_response
from webauthn import generate_authentication_options, verify_authentication_response
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
import base64

router = APIRouter(prefix="/webauthn", tags=["WebAuthn"])

@router.post("/register/options")
async def get_registration_options(data: WebAuthnRegistrationOptions):
    """Get WebAuthn registration options"""
    # Check if user exists
    patient = await database.db.patients.find_one({"email": data.email})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Generate options
    options = generate_registration_options(
        rp_id=settings.WEBAUTHN_RP_ID,
        rp_name=settings.WEBAUTHN_RP_NAME,
        user_id=patient["patient_id"].encode(),
        user_name=data.email,
        user_display_name=patient["full_name"],
        authenticator_selection=AuthenticatorSelectionCriteria(
            user_verification=UserVerificationRequirement.REQUIRED
        )
    )
    
    # Store challenge in session/temporary collection
    await database.db.webauthn_challenges.insert_one({
        "challenge": options.challenge,
        "email": data.email,
        "created_at": datetime.now()
    })
    
    return options.model_dump()

@router.post("/register/verify")
async def verify_registration(data: WebAuthnRegistrationVerify):
    """Verify WebAuthn registration"""
    # Get challenge
    challenge_doc = await database.db.webauthn_challenges.find_one({
        "email": data.email
    })
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No challenge found")
    
    # Verify credential
    try:
        credential = RegistrationCredential.model_validate(data.credential)
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge_doc["challenge"],
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Store credential
    credential_data = {
        "credential_id": base64.b64encode(verification.credential_id).decode(),
        "patient_id": data.email,  # You should get this from your user lookup
        "public_key": verification.credential_public_key,
        "sign_count": verification.sign_count
    }
    await database.db.webauthn_credentials.insert_one(credential_data)
    
    # Update patient
    await database.db.patients.update_one(
        {"email": data.email},
        {"$set": {"has_biometric": True}}
    )
    
    # Clean up challenge
    await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
    
    return {"success": True, "message": "Biometric registered successfully"}

@router.post("/login/options")
async def get_login_options(data: WebAuthnLoginOptions):
    """Get WebAuthn login options"""
    # Check if user has biometric
    patient = await database.db.patients.find_one({"email": data.email})
    if not patient or not patient.get("has_biometric"):
        raise HTTPException(status_code=400, detail="User has no biometric registered")
    
    # Get credential
    credential = await database.db.webauthn_credentials.find_one({
        "patient_id": data.email
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
    await database.db.webauthn_challenges.insert_one({
        "challenge": options.challenge,
        "email": data.email,
        "created_at": datetime.now()
    })
    
    return options.model_dump()

@router.post("/login/verify", response_model=TokenResponse)
async def verify_login(data: WebAuthnLoginVerify):
    """Verify WebAuthn login"""
    # Get challenge
    challenge_doc = await database.db.webauthn_challenges.find_one({
        "email": data.email
    })
    if not challenge_doc:
        raise HTTPException(status_code=400, detail="No challenge found")
    
    # Get credential
    credential = await database.db.webauthn_credentials.find_one({
        "patient_id": data.email
    })
    if not credential:
        raise HTTPException(status_code=400, detail="No credential found")
    
    # Verify authentication
    try:
        auth_credential = AuthenticationCredential.model_validate(data.credential)
        verification = verify_authentication_response(
            credential=auth_credential,
            expected_challenge=challenge_doc["challenge"],
            expected_rp_id=settings.WEBAUTHN_RP_ID,
            expected_origin=settings.WEBAUTHN_ORIGIN,
            credential_public_key=credential["public_key"],
            credential_current_sign_count=credential["sign_count"]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Update sign count
    await database.db.webauthn_credentials.update_one(
        {"_id": credential["_id"]},
        {"$set": {"sign_count": verification.new_sign_count}}
    )
    
    # Get patient
    patient = await database.db.patients.find_one({"email": data.email})
    
    # Create token
    access_token = create_access_token(
        data={"sub": patient["email"], "patient_id": patient["patient_id"]}
    )
    
    # Clean up challenge
    await database.db.webauthn_challenges.delete_one({"_id": challenge_doc["_id"]})
    
    return TokenResponse(
        access_token=access_token,
        patient_id=patient["patient_id"]
    )