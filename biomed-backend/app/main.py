from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database.mongodb import database
from .config import settings
from .routes import auth, patients, medicines, prescriptions, sales, webauthn

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting BioMed Pharmacy API...")
    connected = await database.connect()
    if not connected:
        print("⚠️ Warning: Could not connect to MongoDB")
    yield
    # Shutdown
    await database.disconnect()
    print("🛑 BioMed Pharmacy API shut down")

# Create app
app = FastAPI(
    title="BioMed Pharmacy API",
    description="Biometric-Based Smart Medicine Store Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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
        # Check database connection
        if database.db is None:
            return {
                "status": "unhealthy",
                "database": "disconnected",
                "message": "Database not initialized"
            }
        
        # Ping database
        await database.db.command("ping")
        
        return {
            "status": "healthy",
            "database": "connected",
            "message": "All systems operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "message": "Database connection failed"
        }