from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from dotenv import load_dotenv
from routes import legalTerms

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI.ttorney API",
    description="Production backend API for AI.ttorney legal assistance app",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:8081",  # Expo dev server
        "exp://localhost:8081",   # Expo dev server
        # Add your production domains here
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import routes after app creation to avoid circular imports
from routes import auth

# Include routers
app.include_router(auth.router)
app.include_router(legalTerms.router)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "AI.ttorney API is running",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        from services.supabase_service import SupabaseService
        supabase_service = SupabaseService()
        connection_test = await supabase_service.test_connection()
        
        return {
            "status": "healthy",
            "service": "AI.ttorney API",
            "version": "1.0.0",
            "database": "connected" if connection_test["success"] else "disconnected",
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "degraded",
            "service": "AI.ttorney API",
            "version": "1.0.0",
            "database": "error",
            "error": str(e)
        }

@app.get("/api/test/supabase")
async def test_supabase_connection():
    """Test Supabase connection endpoint"""
    try:
        from services.supabase_service import SupabaseService
        supabase_service = SupabaseService()
        result = await supabase_service.test_connection()
        
        if result["success"]:
            return {
                "status": "success",
                "message": "Supabase connection successful",
            }
        else:
            raise HTTPException(
                status_code=503,
                detail=f"Supabase connection failed: {result['error']}"
            )
    except Exception as e:
        logger.error(f"Supabase test failed: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="Database connection test failed"
        )

if __name__ == "__main__":
    import uvicorn
    
    # Configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("NODE_ENV") != "production"
    
    logger.info(f"Starting server on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )