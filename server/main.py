from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import time
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# Import all routers
from routes.auth import router as auth_router
from routes.legalTerms import router as legalTerms
from routes.legalConsultations import router as legal_consultations_router
from routes.consultationRequest import router as consultation_router
from routes.lawyerInfo import router as lawyer_info_router
from routes.legalConsultAction import router as consult_action
from routes.route_validation import router as route_validation_router
from routes.support import router as support
from routes.auth_reset import router as auth_reset_router
from routes.forum import router as forum_router

load_dotenv()

# Industry-grade logging configuration
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/tmp/app.log') if os.getenv("NODE_ENV") == "production" else logging.NullHandler()
    ]
)
logger = logging.getLogger(__name__)

# Rate limiting setup
limiter = Limiter(key_func=get_remote_address)

logging.getLogger("httpx").setLevel(logging.WARNING)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AI.ttorney API starting up...")
    
    # Production startup checks
    try:
        from services.supabase_service import SupabaseService
        supabase_service = SupabaseService()
        connection_test = await supabase_service.test_connection()
        
        if connection_test["success"]:
            logger.info("✅ Supabase connection established")
        else:
            logger.error(f"❌ Supabase connection issue: {connection_test['error']}")
            raise Exception("Database connection failed")
            
        # Validate critical environment variables
        required_vars = [
            "SUPABASE_URL", 
            "SUPABASE_ANON_KEY", 
            "OPENAI_API_KEY",
            "SUPABASE_SERVICE_ROLE_KEY"
        ]
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise Exception(f"Missing required environment variables: {missing_vars}")
        
        # Warn about recommended production variables
        if os.getenv("NODE_ENV") == "production":
            recommended_vars = ["ALLOWED_ORIGINS", "ALLOWED_HOSTS"]
            missing_recommended = [var for var in recommended_vars if not os.getenv(var)]
            if missing_recommended:
                logger.warning(f"⚠️  Recommended production vars not set: {missing_recommended}")
            
        logger.info("✅ All startup checks passed")
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {str(e)}")
        raise
    
    yield
    
    # Graceful shutdown
    logger.info("🛑 AI.ttorney API shutting down...")
    # Cleanup connections, close file handles, etc.
    await asyncio.sleep(1)  # Allow in-flight requests to complete

app = FastAPI(
    title="AI.ttorney API",
    description="Production backend API for AI.ttorney legal assistance app",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("NODE_ENV") != "production" else None,
    lifespan=lifespan,
    openapi_url="/openapi.json" if os.getenv("NODE_ENV") != "production" else None
)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers for production"""
    response = await call_next(request)
    
    if os.getenv("NODE_ENV") == "production":
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'"
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
    
    return response

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Enhanced request logging with timing"""
    start_time = time.time()
    
    # Log basic info, not headers in production
    if os.getenv("NODE_ENV") == "development":
        logger.info(f" {request.method} {request.url.path}")
        logger.info(f" Headers: {dict(request.headers)}")
    else:
        logger.info(f" {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(f"  Response: {response.status_code} in {process_time:.3f}s")
    
    response.headers["X-Process-Time"] = str(process_time)
    return response

app.state.limiter = limiter

# Production-grade middleware stack
if os.getenv("NODE_ENV") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["*"] if os.getenv("NODE_ENV") == "development" else os.getenv("ALLOWED_HOSTS", "*.railway.app,localhost,127.0.0.1").split(",")
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Native mobile apps don't need CORS restrictions
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Production-grade error handling"""
    logger.error(f"💥 Global exception: {str(exc)}", exc_info=True)
    
    if os.getenv("NODE_ENV") == "production":
        # Don't expose internal errors in production
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    else:
        # Show full error in development
        return JSONResponse(
            status_code=500,
            content={
                "detail": "Internal server error",
                "error": str(exc),
                "type": type(exc).__name__
            }
        )

app.include_router(auth_router)
app.include_router(legalTerms)
app.include_router(legal_consultations_router)
app.include_router(consultation_router)
app.include_router(lawyer_info_router)
app.include_router(consult_action)
app.include_router(route_validation_router, prefix="/api")
app.include_router(support, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(auth_reset_router, prefix="/api")

                                              
from routes.lawyer_applications import router as lawyer_applications_router
app.include_router(lawyer_applications_router, prefix="/api")
app.include_router(forum_router, prefix="/api")

                                        
from routes.places_proxy import router as places_proxy_router
app.include_router(places_proxy_router)

                                        
from routes.user_profile import router as user_profile_router
app.include_router(user_profile_router)

                                     
from api.forum_search import router as forum_search_router
app.include_router(forum_search_router)

                                                                      
                                                                     
from api.chatbot_user_streaming import router as user_chatbot_streaming_router
from api.chatbot_lawyer_streaming import router as lawyer_chatbot_streaming_router
from api.chatbot_user import router as user_chatbot_router
from api.chatbot_lawyer import router as lawyer_chatbot_router
app.include_router(user_chatbot_streaming_router)                              
app.include_router(lawyer_chatbot_streaming_router)                              
app.include_router(user_chatbot_router)                   
app.include_router(lawyer_chatbot_router)                   

                                        
from routes.chat_history import router as chat_history_router
app.include_router(chat_history_router)


                                            
from routes.admin_moderation import router as admin_moderation_router
app.include_router(admin_moderation_router, prefix="/api")

                                           
from routes.user_moderation import router as user_moderation_router
app.include_router(user_moderation_router, prefix="/api")

                                              
from routes.suspension_appeals import user_router as appeals_user_router, admin_router as appeals_admin_router
app.include_router(appeals_user_router, prefix="/api")
app.include_router(appeals_admin_router, prefix="/api")
                                                   
from routes.user_appeals import router as user_appeals_router
from routes.admin_appeals import router as admin_appeals_router
app.include_router(user_appeals_router)
app.include_router(admin_appeals_router)

                                                    
from routes.user_favorites import router as user_favorites_router
app.include_router(user_favorites_router)

                                         
from routes.notifications import router as notifications_router
app.include_router(notifications_router)

@app.get("/")
@limiter.limit("60/minute")
async def root(request: Request):
    """Health check endpoint with rate limiting"""
    return {
        "message": "AI.ttorney API is running",
        "status": "healthy",
        "version": "1.0.0",
        "environment": os.getenv("NODE_ENV", "development"),
        "timestamp": time.time()
    }

@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    """Production-grade health check with dependencies"""
    health_status = {
        "status": "healthy",
        "service": "AI.ttorney API",
        "version": "1.0.0",
        "environment": os.getenv("NODE_ENV", "development"),
        "timestamp": time.time(),
        "checks": {}
    }
    
    # Check database connection
    try:
        from services.supabase_service import SupabaseService
        supabase_service = SupabaseService()
        connection_test = await supabase_service.test_connection()
        
        if connection_test["success"]:
            health_status["checks"]["database"] = "connected"
        else:
            health_status["checks"]["database"] = f"error: {connection_test['error']}"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check OpenAI API
    try:
        import openai
        openai.api_key = os.getenv("OPENAI_API_KEY")
        # Simple test - just check if key is set
        if openai.api_key:
            health_status["checks"]["openai"] = "connected"
        else:
            health_status["checks"]["openai"] = "error: missing API key"
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["checks"]["openai"] = f"error: {str(e)}"
        health_status["status"] = "degraded"
    
    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JSONResponse(
        status_code=status_code,
        content=health_status
    )

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
    import asyncio
    
    # Production server configuration
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    workers = int(os.getenv("WORKERS", 1))
    debug = os.getenv("NODE_ENV") != "production"
    
    logger.info(f"🚀 Starting production server on {host}:{port}")
    logger.info(f"📊 Environment: {os.getenv('NODE_ENV', 'development')}")
    logger.info(f"👥 Workers: {workers}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        workers=workers if not debug else 1,
        reload=debug,
        log_level="info",
        access_log=True,
        use_colors=debug
    )