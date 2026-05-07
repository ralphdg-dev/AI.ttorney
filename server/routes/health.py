"""
Enterprise Health Check Endpoints
Monitor system health and provide diagnostics
"""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional
import logging
from services.feature_health_monitor import health_monitor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2026-05-07T02:00:00Z",
        "service": "AI.ttorney API",
        "version": "1.0.0"
    }

@router.get("/comprehensive")
async def comprehensive_health_check():
    """Comprehensive health check of all features"""
    try:
        if health_monitor.is_due_for_check():
            results = await health_monitor.check_all_features()
        else:
            results = health_monitor.feature_status
            
        return results
        
    except Exception as e:
        logger.error(f"❌ Comprehensive health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )

@router.get("/feature/{feature_name}")
async def feature_health_check(feature_name: str):
    """Check health of a specific feature"""
    try:
        # Check if it's a known feature
        if feature_name not in health_monitor.critical_features:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unknown feature: {feature_name}"
            )
        
        # Get cached status or perform fresh check
        cached_status = health_monitor.get_feature_status(feature_name)
        if cached_status:
            return cached_status
        else:
            # Perform fresh check
            status = await health_monitor._check_feature_health(feature_name)
            return status
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Feature health check failed for {feature_name}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Feature health check failed: {str(e)}"
        )

@router.get("/database")
async def database_health_check():
    """Check database schema health"""
    try:
        schema_health = await health_monitor._check_database_schema_health()
        return schema_health
        
    except Exception as e:
        logger.error(f"❌ Database health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database health check failed: {str(e)}"
        )

@router.get("/signup-test")
async def signup_health_test():
    """Test signup functionality without creating users"""
    try:
        signup_health = await health_monitor._check_signup_health()
        return signup_health
        
    except Exception as e:
        logger.error(f"❌ Signup health test failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup health test failed: {str(e)}"
        )
