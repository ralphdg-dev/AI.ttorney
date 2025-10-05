from fastapi import APIRouter, HTTPException, Query
from services.supabase_service import SupabaseService
from typing import List, Optional
import logging
import httpx
from pydantic import BaseModel
from datetime import datetime
from cachetools import TTLCache
import asyncio
import time
import uuid

router = APIRouter(prefix="/legal-consultations", tags=["legal-consultations"])
logger = logging.getLogger(__name__)

lawyers_cache = TTLCache(maxsize=100, ttl=300) 
single_lawyer_cache = TTLCache(maxsize=500, ttl=300) 

pending_requests = {}
request_lock = asyncio.Lock()

class Lawyer(BaseModel):
    id: uuid.UUID
    lawyer_id: uuid.UUID
    name: str
    bio: str
    specialization: Optional[str] = None
    location: Optional[str] = None
    hours: Optional[str] = None
    days: Optional[str] = None
    available: bool
    hours_available: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LawyerResponse(BaseModel):
    success: bool
    data: Optional[List[Lawyer]] = None
    error: Optional[str] = None
    cached: bool = False
    timestamp: Optional[float] = None

def get_cache_key(*args):
    """Generate a cache key from arguments"""
    return ":".join(str(arg) for arg in args)

async def get_lawyers_with_cache(supabase_service, use_cache=True):
    """Get lawyers with caching support"""
    cache_key = "all_lawyers"
    
    if use_cache and cache_key in lawyers_cache:
        logger.info("Returning cached lawyers data")
        cached_data = lawyers_cache[cache_key]
        cached_data['cached'] = True
        return cached_data
    
    async with request_lock:
        if cache_key in pending_requests:
            logger.info("Waiting for ongoing lawyers request to complete")
            return await pending_requests[cache_key]
        
        future = asyncio.Future()
        pending_requests[cache_key] = future
        
    try:
        start_time = time.time()
        lawyers = await fetch_lawyers_from_db(supabase_service)
        elapsed_time = time.time() - start_time
        
        logger.info(f"Fetched {len(lawyers)} lawyers in {elapsed_time:.2f} seconds")
        
        response_data = LawyerResponse(
            success=True, 
            data=lawyers,
            cached=False,
            timestamp=time.time()
        )
        
        lawyers_cache[cache_key] = response_data.dict()
        
        return response_data.dict()
        
    except Exception as e:
        error_response = LawyerResponse(
            success=False, 
            error=str(e),
            cached=False,
            timestamp=time.time()
        )
        return error_response.dict()
    finally:
        async with request_lock:
            if cache_key in pending_requests:
                future = pending_requests.pop(cache_key)
                if not future.done():
                    future.set_result(response_data.dict() if 'response_data' in locals() else error_response.dict())

async def fetch_lawyers_from_db(supabase_service):
    """Fetch lawyers from database with optimized query"""
    try:
        response = supabase_service.supabase.table("lawyer_info").select("*").execute()
        
        if hasattr(response, 'data') and response.data:
            lawyers_data = response.data
            logger.info(f"Found {len(lawyers_data)} lawyers using Supabase client")
            
            lawyers = []
            for lawyer_data in lawyers_data:
                try:
                    lawyer = Lawyer(
                        id=lawyer_data.get("id"),
                        lawyer_id=lawyer_data.get("lawyer_id"),
                        name=lawyer_data.get("name", "Unknown Lawyer"),
                        specialization=lawyer_data.get("specialization"),
                        location=lawyer_data.get("location"),
                        hours=lawyer_data.get("hours"),
                        days=lawyer_data.get("days"),
                        bio=lawyer_data.get("bio"),
                        available=bool(lawyer_data.get("available", False)),
                        hours_available=lawyer_data.get("hours_available"),
                        created_at=lawyer_data.get("created_at")
                    )
                    lawyers.append(lawyer)
                except Exception as e:
                    logger.warning(f"Error parsing lawyer data: {e}, data: {lawyer_data}")
                    continue
            
            if not lawyers:
                raise Exception("No valid lawyer data found")
            
            return lawyers
        else:
            raise Exception("No data returned from Supabase client")
            
    except Exception as client_error:
        logger.warning(f"Supabase client failed, falling back to HTTP: {str(client_error)}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"{supabase_service.rest_url}/lawyer_info"
                response = await client.get(
                    url,
                    params={"select": "*"},
                    headers=supabase_service._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    lawyers_data = response.json()
                    if not lawyers_data:
                        raise Exception("No data returned from HTTP API")
                    
                    logger.info(f"Found {len(lawyers_data)} lawyers using HTTP")
                    
                    lawyers = []
                    for lawyer_data in lawyers_data:
                        try:
                            lawyer = Lawyer(
                                id=lawyer_data.get("id"),
                                lawyer_id=lawyer_data.get("lawyer_id"),
                                name=lawyer_data.get("name", "Unknown Lawyer"),
                                specialization=lawyer_data.get("specialization"),
                                location=lawyer_data.get("location"),
                                hours=lawyer_data.get("hours"),
                                bio=lawyer_data.get("bio"),
                                days=lawyer_data.get("days"),
                                available=bool(lawyer_data.get("available", False)),
                                hours_available=lawyer_data.get("hours_available"),
                                created_at=lawyer_data.get("created_at")
                            )
                            lawyers.append(lawyer)
                        except Exception as e:
                            logger.warning(f"Error parsing lawyer data from HTTP: {e}")
                            continue
                    
                    if not lawyers:
                        raise Exception("No valid lawyer data found from HTTP")
                    
                    return lawyers
                else:
                    raise Exception(f"HTTP request failed: {response.status_code} - {response.text}")
        except Exception as http_error:
            logger.error(f"HTTP fallback also failed: {http_error}")
            raise client_error from http_error

@router.get("/lawyers", response_model=LawyerResponse)
async def get_lawyers(
    use_cache: bool = Query(True, description="Use cached data if available"),
    refresh: bool = Query(False, description="Force refresh cache")
):
    """Get all lawyers from the database with caching"""
    try:
        if refresh:
            cache_key = "all_lawyers"
            lawyers_cache.pop(cache_key, None)
            logger.info("Cache cleared due to refresh request")
        
        supabase_service = SupabaseService()
        result = await get_lawyers_with_cache(supabase_service, use_cache)
        return LawyerResponse(**result)
        
    except Exception as e:
        logger.error(f"Error fetching lawyers: {str(e)}", exc_info=True)
        return LawyerResponse(success=False, error=str(e))

@router.get("/lawyers/{lawyer_id}", response_model=LawyerResponse)
async def get_lawyer(
    lawyer_id: str, 
    use_cache: bool = Query(True, description="Use cached data if available")
):
    """Get a specific lawyer by ID with caching"""
    try:
        # Validate UUID format
        try:
            uuid.UUID(lawyer_id)
        except ValueError:
            return LawyerResponse(success=False, error="Invalid lawyer ID format")
        
        cache_key = f"lawyer_{lawyer_id}"
        
        if use_cache and cache_key in single_lawyer_cache:
            logger.info(f"Returning cached data for lawyer {lawyer_id}")
            cached_data = single_lawyer_cache[cache_key]
            cached_data['cached'] = True
            return LawyerResponse(**cached_data)
        
        supabase_service = SupabaseService()
        
        response = supabase_service.supabase.table("lawyer_info").select("*").eq("lawyer_id", lawyer_id).execute()
        
        if hasattr(response, 'data') and response.data:
            lawyer_data = response.data[0]
            lawyer = Lawyer(
                id=lawyer_data.get("id"),
                lawyer_id=lawyer_data.get("lawyer_id"),
                name=lawyer_data.get("name", "Unknown Lawyer"),
                specialization=lawyer_data.get("specialization"),
                location=lawyer_data.get("location"),
                hours=lawyer_data.get("hours"),
                bio=lawyer_data.get("bio"),
                days=lawyer_data.get("days"),
                available=bool(lawyer_data.get("available", False)),
                hours_available=lawyer_data.get("hours_available"),
                created_at=lawyer_data.get("created_at")
            )
            
            result = LawyerResponse(success=True, data=[lawyer], cached=False)
            single_lawyer_cache[cache_key] = result.dict()
            
            return result
        else:
            return LawyerResponse(success=False, error="Lawyer not found")
            
    except Exception as e:
        logger.error(f"Error fetching lawyer: {str(e)}", exc_info=True)
        return LawyerResponse(success=False, error=str(e))

@router.delete("/cache/clear")
async def clear_cache():
    """Clear all caches"""
    lawyers_cache.clear()
    single_lawyer_cache.clear()
    pending_requests.clear()
    return {"success": True, "message": "Cache cleared successfully"}

@router.get("/cache/status")
async def cache_status():
    """Get cache status"""
    return {
        "all_lawyers_cache_size": len(lawyers_cache),
        "single_lawyer_cache_size": len(single_lawyer_cache),
        "pending_requests": len(pending_requests)
    }
    
# Add this to your consultation_requests.py router
@router.get("/user/{user_id}/active-requests")
async def check_active_consultation_requests(user_id: str):
    """Check if user has any active consultation requests"""
    try:
        # Check for pending or accepted requests
        supabase_service = SupabaseService()
        
        response = (
            supabase_service.supabase
            .table("consultation_requests")
            .select("id, status")
            .eq("user_id", user_id)
            .in_("status", ["pending", "accepted"])
            .execute()
            )

        
        has_active_requests = len(response.data) > 0 if response.data else False
        
        return {
            "success": True,
            "has_active_requests": has_active_requests,
            "active_requests_count": len(response.data) if response.data else 0,
            "requests": response.data if has_active_requests else []
        }
        
    except Exception as e:
        logger.error(f"Error checking active requests: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "has_active_requests": False
        }