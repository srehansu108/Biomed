from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    MONGODB_URL: str = "mongodb://srehansududulbarik_db_user:UY7N84wY7baPLvp1@ac-e4jucp9-shard-00-00.ilq9ipb.mongodb.net:27017,ac-e4jucp9-shard-00-01.ilq9ipb.mongodb.net:27017,ac-e4jucp9-shard-00-02.ilq9ipb.mongodb.net:27017/?ssl=true&replicaSet=atlas-zss8t8-shard-0&authSource=admin&appName=Cluster0"
    DATABASE_NAME: str = "Biomed"
    
    # Security
    SECRET_KEY: str = "temp1234"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # WebAuthn
    WEBAUTHN_RP_ID: str = "biomed-auth.netlify.app"
    WEBAUTHN_RP_NAME: str = "BioMed Pharmacy"
    WEBAUTHN_ORIGIN: str = "https://biomed-auth.netlify.app"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "https://biomed-2nq9.onrender.com", "https://biomed-auth.netlify.app"]
    
    # QR Code
    QR_CODE_EXPIRY_SECONDS: int = 300
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()