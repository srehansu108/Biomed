from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "biomed_pharmacy"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # WebAuthn
    WEBAUTHN_RP_ID: str = "localhost"
    WEBAUTHN_RP_NAME: str = "BioMed Pharmacy"
    WEBAUTHN_ORIGIN: str = "http://localhost:3000"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]
    
    # QR Code
    QR_CODE_EXPIRY_SECONDS: int = 300
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()