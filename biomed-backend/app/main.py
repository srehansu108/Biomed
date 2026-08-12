from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging
import time
from .database.mongodb import database
from .config import settings
from .routes import auth, patients, medicines, prescriptions, sales, webauthn

# Configure logging
logging.basicConfig(
    level=settings.LOG_LEVEL if hasattr(settings, 'LOG_LEVEL') else "INFO",
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting BioMed Pharmacy API...")
    logger.info(f"Environment: {settings.ENVIRONMENT if hasattr(settings, 'ENVIRONMENT') else 'development'}")
    
    connected = await database.connect()
    if not connected:
        logger.error("❌ Failed to connect to MongoDB!")
        raise RuntimeError("Database connection failed")
    
    yield
    # Shutdown
    await database.disconnect()
    logger.info("🛑 BioMed Pharmacy API shut down")

# Create app
app = FastAPI(
    title="BioMed Pharmacy API",
    description="Biometric-Based Smart Medicine Store Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(auth.router, prefix="/api")
app.include_router(webauthn.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(medicines.router, prefix="/api")
app.include_router(prescriptions.router, prefix="/api")
app.include_router(sales.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Welcome to BioMed Pharmacy API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        if database.db is None:
            return {
                "status": "unhealthy",
                "database": "disconnected"
            }
        
        await database.db.command("ping")
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }