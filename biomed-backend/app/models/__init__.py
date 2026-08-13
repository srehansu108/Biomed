# models/__init__.py
from .patient import Patient, Address, PyObjectId
from .medicine import Medicine
from .prescription import Prescription
from .webauthn import WebAuthnCredential, WebAuthnChallenge
from .patient_medicine import PatientMedicine