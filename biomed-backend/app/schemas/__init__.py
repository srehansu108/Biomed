# schemas/__init__.py
from .auth import (
    UserRegister,
    UserLogin,
    TokenResponse,
    WebAuthnRegistrationOptions,
    WebAuthnRegistrationVerify,
    WebAuthnLoginOptions,
    WebAuthnLoginVerify,
    CheckRegistrationStatus
)
from .medicine import MedicineCreate, MedicineUpdate
from .patient_medicine import PatientMedicineCreate, PatientMedicineUpdate