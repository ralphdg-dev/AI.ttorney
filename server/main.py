from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.auth import router as auth_router
from routes.legalGuides import router as legal_router
from routes.route_validation import router as route_validation_router
from routes.consultationRequest import router as consultation_router
from routes.lawyerInfo import router as lawyer_info_router
from routes.legalConsultAction import router as consult_action
from services.supabase_service import SupabaseService
import logging
import os
from dotenv import load_dotenv
from routes import legalTerms
from contextlib import asynccontextmanager
from routes.legalConsultations import router as legal_consultations_router
from routes import support


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Set httpx to WARNING level to reduce noise
logging.getLogger("httpx").setLevel(logging.WARNING)

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("AI.ttorney API starting up...")
    
    # Test Supabase connection on startup
    try:
        supabase_service = SupabaseService()
        connection_test = await supabase_service.test_connection()
        
        if connection_test["success"]:
            logger.info("✅ Supabase connection established")
        else:
            logger.warning(f"⚠️ Supabase connection issue: {connection_test['error']}")
    except Exception as e:
        logger.error(f"❌ Failed to test Supabase connection: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("AI.ttorney API shutting down...")

# Create FastAPI app
app = FastAPI(
    title="AI.ttorney API",
    description="Production backend API for AI.ttorney legal assistance app",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:8081",  # Expo dev server
        "exp://localhost:8081",   # Expo dev server
        "http://192.168.68.109:8081",  # Current network Expo dev server
        "exp://192.168.68.109:8081",   # Current network Expo dev server
        "http://192.168.68.109:8000",  # API server access
        "http://192.168.68.102:8081",  # Old network Expo dev server
        "exp://192.168.68.102:8081",   # Old network Expo dev server
        "http://192.168.68.102:8000",  # Old API server access
        "*",  # Allow all origins for Expo Go (development only)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import routes after app creation to avoid circular imports
from routes import auth
from routes.forum import router as forum_router

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"🌐 {request.method} {request.url.path}")
    logger.info(f"🔑 Headers: {dict(request.headers)}")
    response = await call_next(request)
    logger.info(f"📤 Response status: {response.status_code}")
    return response

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# Include routers (consolidated)
app.include_router(auth_router)
app.include_router(legal_router)
app.include_router(legalTerms.router)
app.include_router(legal_consultations_router)
app.include_router(consultation_router)
app.include_router(lawyer_info_router)
app.include_router(consult_action)
app.include_router(route_validation_router, prefix="/api")
app.include_router(support.router, prefix="/api")

# Import and include lawyer application router
from routes.lawyer_applications import router as lawyer_applications_router
app.include_router(lawyer_applications_router, prefix="/api")
app.include_router(forum_router, prefix="/api")

# Import and include places proxy router
from routes.places_proxy import router as places_proxy_router
app.include_router(places_proxy_router)

# Import and include user profile router
from routes.user_profile import router as user_profile_router
app.include_router(user_profile_router)

# Import and include forum search API
from api.forum_search import router as forum_search_router
app.include_router(forum_search_router)

# Import and include chatbot routers (separated for users and lawyers)
# IMPORTANT: Register streaming routers FIRST so they take precedence
from api.chatbot_user_streaming import router as user_chatbot_streaming_router
from api.chatbot_lawyer_streaming import router as lawyer_chatbot_streaming_router
from api.chatbot_user import router as user_chatbot_router
from api.chatbot_lawyer import router as lawyer_chatbot_router
app.include_router(user_chatbot_streaming_router)  # Streaming takes precedence
app.include_router(lawyer_chatbot_streaming_router)  # Streaming takes precedence
app.include_router(user_chatbot_router)  # Legacy/fallback
app.include_router(lawyer_chatbot_router)  # Legacy/fallback

# Import and include chat history routes
from routes.chat_history import router as chat_history_router
app.include_router(chat_history_router)

# Import and include admin moderation routes
from routes.admin_moderation import router as admin_moderation_router
app.include_router(admin_moderation_router, prefix="/api")

# Import and include user moderation routes
from routes.user_moderation import router as user_moderation_router
app.include_router(user_moderation_router, prefix="/api")

# Import and include suspension appeals routes
from routes.suspension_appeals import user_router as appeals_user_router, admin_router as appeals_admin_router
app.include_router(appeals_user_router, prefix="/api")
app.include_router(appeals_admin_router, prefix="/api")
# Import and include appeal routes (user and admin)
from routes.user_appeals import router as user_appeals_router
from routes.admin_appeals import router as admin_appeals_router
app.include_router(user_appeals_router)
app.include_router(admin_appeals_router)

# Import and include user favorites/bookmarks routes
from routes.user_favorites import router as user_favorites_router
app.include_router(user_favorites_router)

# Import and include notifications routes
from routes.notifications import router as notifications_router
app.include_router(notifications_router)

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