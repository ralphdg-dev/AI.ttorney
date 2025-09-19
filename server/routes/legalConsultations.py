from fastapi import APIRouter, HTTPException, Query
from services.supabase_service import SupabaseService
from typing import List, Optional
import logging
import httpx
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/legal-consultations", tags=["legal-consultations"])
logger = logging.getLogger(__name__)

class Lawyer(BaseModel):
    id: int
    lawyer_id: str
    name: str
    specializations: str
    location: str
    hours: str
    days: str
    available: str
    created_at: datetime
    hours_available: str

    class Config:
        from_attributes = True

class LawyerResponse(BaseModel):
    success: bool
    data: Optional[List[Lawyer]] = None
    error: Optional[str] = None

@router.get("/lawyers", response_model=LawyerResponse)
async def get_lawyers():
    """Get all lawyers from the database"""
    try:
        supabase_service = SupabaseService()
        
        # Debug: Log the URL we're trying to access
        url = f"{supabase_service.rest_url}/lawyer_info"
        logger.info(f"Fetching lawyers from: {url}")
        
        # Use the Supabase client instead of raw HTTP requests
        try:
            # Try using the Supabase Python client first
            response = supabase_service.supabase.table("lawyer_info").select("*").execute()
            
            logger.info(f"Supabase client response: {response}")
            
            if hasattr(response, 'data') and response.data:
                lawyers_data = response.data
                logger.info(f"Found {len(lawyers_data)} lawyers using Supabase client")
                
                lawyers = []
                for lawyer_data in lawyers_data:
                    lawyer = Lawyer(
                        id=lawyer_data.get("id"),
                        lawyer_id=lawyer_data.get("lawyer_id", ""),
                        name=lawyer_data.get("name", "Unknown Lawyer"),
                        specializations=lawyer_data.get("specializations", ""),
                        location=lawyer_data.get("location", ""),
                        hours=lawyer_data.get("hours", ""),
                        days=lawyer_data.get("days", ""),
                        available=str(lawyer_data.get("available", "")),
                        hours_available=lawyer_data.get("hours_available", ""),
                        created_at=lawyer_data.get("created_at")
                    )
                    lawyers.append(lawyer)
                
                return LawyerResponse(success=True, data=lawyers)
            
        except Exception as client_error:
            logger.warning(f"Supabase client failed, falling back to HTTP: {str(client_error)}")
            
            # Fallback to HTTP request
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={"select": "*"},
                    headers=supabase_service._get_headers(use_service_key=True)
                )
                
                logger.info(f"HTTP Response status: {response.status_code}")
                
                if response.status_code == 200:
                    lawyers_data = response.json()
                    logger.info(f"Found {len(lawyers_data)} lawyers using HTTP")
                    
                    lawyers = []
                    for lawyer_data in lawyers_data:
                        lawyer = Lawyer(
                            id=lawyer_data.get("id"),
                            lawyer_id=lawyer_data.get("lawyer_id", ""),
                            name=lawyer_data.get("name", "Unknown Lawyer"),
                            specializations=lawyer_data.get("specializations", ""),
                            location=lawyer_data.get("location", ""),
                            hours=lawyer_data.get("hours", ""),
                            days=lawyer_data.get("days", ""),
                            available=str(lawyer_data.get("available", "")),
                            hours_available=lawyer_data.get("hours_available", ""),
                            created_at=lawyer_data.get("created_at")
                        )
                        lawyers.append(lawyer)
                    
                    return LawyerResponse(success=True, data=lawyers)
                else:
                    error_msg = f"Failed to fetch lawyers: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    return LawyerResponse(success=False, error=error_msg)
            
    except Exception as e:
        logger.error(f"Error fetching lawyers: {str(e)}", exc_info=True)
        return LawyerResponse(success=False, error=str(e))

@router.get("/debug/tables")
async def debug_tables():
    """Debug endpoint to check available tables"""
    try:
        supabase_service = SupabaseService()
        
        # Check what tables are available
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{supabase_service.rest_url}/",
                headers=supabase_service._get_headers(use_service_key=True)
            )
            
            logger.info(f"Available tables: {response.text}")
            
            # Try to get information about lawyer_info table specifically
            table_response = await client.get(
                f"{supabase_service.rest_url}/lawyer_info",
                params={"select": "id", "limit": "1"},
                headers=supabase_service._get_headers(use_service_key=True)
            )
            
            return {
                "all_tables": response.text if response.status_code == 200 else f"Error: {response.status_code}",
                "lawyer_info_table": table_response.text if table_response.status_code == 200 else f"Error: {table_response.status_code}"
            }
            
    except Exception as e:
        return {"error": str(e)}    

@router.get("/lawyers/{lawyer_id}", response_model=LawyerResponse)
async def get_lawyer(lawyer_id: str):
    """Get a specific lawyer by ID"""
    try:
        supabase_service = SupabaseService()
        
        # Try using the Supabase client first
        try:
            response = supabase_service.supabase.table("lawyer_info").select("*").eq("lawyer_id", lawyer_id).execute()
            
            if hasattr(response, 'data') and response.data:
                lawyer_data = response.data[0]
                lawyer = Lawyer(
                    id=lawyer_data.get("id"),
                    lawyer_id=lawyer_data.get("lawyer_id", ""),
                    name=lawyer_data.get("name", "Unknown Lawyer"),
                    specializations=lawyer_data.get("specializations", ""),
                    location=lawyer_data.get("location", ""),
                    hours=lawyer_data.get("hours", ""),
                    days=lawyer_data.get("days", ""),
                    available=str(lawyer_data.get("available", "")),
                    hours_available=lawyer_data.get("hours_available", ""),
                    created_at=lawyer_data.get("created_at")
                )
                return LawyerResponse(success=True, data=[lawyer])
            else:
                return LawyerResponse(success=False, error="Lawyer not found")
                
        except Exception as client_error:
            logger.warning(f"Supabase client failed, falling back to HTTP: {str(client_error)}")
            
            # Fallback to HTTP request
            url = f"{supabase_service.rest_url}/lawyer_info"
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={"select": "*", "lawyer_id": f"eq.{lawyer_id}"},
                    headers=supabase_service._get_headers(use_service_key=True)
                )
                
                if response.status_code == 200:
                    lawyer_data = response.json()
                    if lawyer_data and len(lawyer_data) > 0:
                        lawyer = Lawyer(
                            id=lawyer_data[0].get("id"),
                            lawyer_id=lawyer_data[0].get("lawyer_id", ""),
                            name=lawyer_data[0].get("name", "Unknown Lawyer"),
                            specializations=lawyer_data[0].get("specializations", ""),
                            location=lawyer_data[0].get("location", ""),
                            hours=lawyer_data[0].get("hours", ""),
                            days=lawyer_data[0].get("days", ""),
                            available=str(lawyer_data[0].get("available", "")),
                            hours_available=lawyer_data[0].get("hours_available", ""),
                            created_at=lawyer_data[0].get("created_at")
                        )
                        return LawyerResponse(success=True, data=[lawyer])
                    else:
                        return LawyerResponse(success=False, error="Lawyer not found")
                else:
                    error_msg = f"Failed to fetch lawyer: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    return LawyerResponse(success=False, error=error_msg)
            
    except Exception as e:
        logger.error(f"Error fetching lawyer: {str(e)}", exc_info=True)
        return LawyerResponse(success=False, error=str(e))