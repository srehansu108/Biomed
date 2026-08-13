from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging
import time
from .database.mongodb import database
from .config import settings
from .routes import auth, patients, medicines, prescriptions, sales, webauthn, patient_medicines

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
    
    # Connect to database
    connected = await database.connect()
    if not connected:
        logger.error("❌ Failed to connect to MongoDB!")
        raise RuntimeError("Database connection failed")
    
    # Verify WebAuthn configuration
    try:
        from .routes.webauthn import validate_webauthn_config
        validate_webauthn_config()
        logger.info("✅ WebAuthn configuration validated")
    except Exception as e:
        logger.error(f"❌ WebAuthn configuration error: {e}")
        raise
    
    logger.info("✅ All systems ready!")
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

# GZip Middleware - Compress responses
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests"""
    start_time = time.time()
    
    # Log request
    logger.info(f"Request: {request.method} {request.url.path}")
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = time.time() - start_time
    logger.info(
        f"Response: {response.status_code} - {request.method} {request.url.path} "
        f"({process_time:.3f}s)"
    )
    
    # Add processing time header
    response.headers["X-Process-Time"] = str(process_time)
    return response

# CORS middleware
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
app.include_router(patient_medicines.router, prefix="/api")  # ✅ New route

@app.get("/")
async def root():
    return {
        "message": "Welcome to BioMed Pharmacy API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db_status = await database.ping()
        
        return {
            "status": "healthy" if db_status else "unhealthy",
            "database": "connected" if db_status else "disconnected",
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": time.time()
        }

# Error handler for 404
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=404,
        content={
            "detail": "Not Found",
            "path": request.url.path,
            "method": request.method
        }
    )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc) if settings.DEBUG else "An error occurred"
        }
    )