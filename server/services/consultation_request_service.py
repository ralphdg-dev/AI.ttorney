import httpx
import os
import json
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import logging
from datetime import datetime
from supabase import create_client, Client

load_dotenv()
logger = logging.getLogger(__name__)

class ConsultationRequestService:
    """Service for managing consultation requests"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("Missing Supabase configuration")
        
        self.rest_url = f"{self.url}/rest/v1"
        
        # Create Supabase client for direct database operations
        self.supabase: Client = create_client(self.url, self.anon_key)
    
    def _get_headers(self, use_service_key: bool = False) -> Dict[str, str]:
        """Get request headers"""
        key = self.service_key if use_service_key and self.service_key else self.anon_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def create_consultation_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new consultation request"""
        try:
            # Validate required fields
            required_fields = [
                'user_id', 'lawyer_id', 'message', 'email', 
                'mobile_number', 'consultation_date', 'consultation_time', 
                'consultation_mode'
            ]
            
            for field in required_fields:
                if field not in request_data or not request_data[field]:
                    return {"success": False, "error": f"Missing required field: {field}"}
            
            # Prepare consultation request data
            consultation_request = {
                "user_id": request_data["user_id"],
                "lawyer_id": request_data["lawyer_id"],  # Now references lawyer_info.lawyer_id
                "message": request_data["message"],
                "email": request_data["email"],
                "mobile_number": request_data["mobile_number"],
                "status": "pending",
                "requested_at": datetime.utcnow().isoformat(),
                "responded_at": None,
                "consultation_date": request_data["consultation_date"],
                "consultation_time": request_data["consultation_time"],
                "consultation_mode": request_data["consultation_mode"]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.rest_url}/consultation_requests",
                    json=consultation_request,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 201]:
                    data = response.json()
                    logger.info(f"Consultation request created successfully: {data}")
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Create consultation request failed: {response.status_code}, {error_data}")
                    return {"success": False, "error": error_data.get("message", "Failed to create consultation request")}
                    
        except Exception as e:
            logger.error(f"Create consultation request error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_consultation_requests_by_user(self, user_id: str) -> Dict[str, Any]:
        """Get all consultation requests for a specific user"""
        try:
            async with httpx.AsyncClient() as client:
                # Updated join to reference lawyer_info.lawyer_id instead of lawyer_info.id
                response = await client.get(
                    f"{self.rest_url}/consultation_requests?user_id=eq.{user_id}&select=*,lawyer_info:lawyer_id(name,specializations)&order=requested_at.desc",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data.get("message", "Failed to get consultation requests")}
                    
        except Exception as e:
            logger.error(f"Get consultation requests by user error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_consultation_requests_by_lawyer(self, lawyer_id: str) -> Dict[str, Any]:
        """Get all consultation requests for a specific lawyer"""
        try:
            async with httpx.AsyncClient() as client:
                # Updated to filter by lawyer_id which now references lawyer_info.lawyer_id
                response = await client.get(
                    f"{self.rest_url}/consultation_requests?lawyer_id=eq.{lawyer_id}&select=*,users(first_name,last_name,email)&order=requested_at.desc",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return {"success": True, "data": data}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data.get("message", "Failed to get consultation requests")}
                    
        except Exception as e:
            logger.error(f"Get consultation requests by lawyer error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_consultation_request_status(self, request_id: str, status: str, responder_id: str = None) -> Dict[str, Any]:
        """Update consultation request status (accept/reject)"""
        try:
            if status not in ["pending", "accepted", "rejected"]:
                return {"success": False, "error": "Invalid status. Must be 'pending', 'accepted', or 'rejected'"}
            
            update_data = {
                "status": status,
                "responded_at": datetime.utcnow().isoformat()
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.rest_url}/consultation_requests?id=eq.{request_id}",
                    json=update_data,
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True, "message": f"Consultation request {status} successfully"}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data.get("message", "Failed to update consultation request")}
                    
        except Exception as e:
            logger.error(f"Update consultation request status error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_consultation_request_by_id(self, request_id: str) -> Dict[str, Any]:
        """Get a specific consultation request by ID"""
        try:
            async with httpx.AsyncClient() as client:
                # Updated join to reference lawyer_info.lawyer_id
                response = await client.get(
                    f"{self.rest_url}/consultation_requests?id=eq.{request_id}&select=*,lawyer_info:lawyer_id(name,specializations),users(first_name,last_name,email)",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        return {"success": True, "data": data[0]}
                    else:
                        return {"success": False, "error": "Consultation request not found"}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data.get("message", "Failed to get consultation request")}
                    
        except Exception as e:
            logger.error(f"Get consultation request by ID error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def delete_consultation_request(self, request_id: str, user_id: str) -> Dict[str, Any]:
        """Delete a consultation request (only by the user who created it)"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"{self.rest_url}/consultation_requests?id=eq.{request_id}&user_id=eq.{user_id}",
                    headers=self._get_headers(use_service_key=True)
                )
                
                if response.status_code in [200, 204]:
                    return {"success": True, "message": "Consultation request deleted successfully"}
                else:
                    error_data = response.json() if response.content else {}
                    return {"success": False, "error": error_data.get("message", "Failed to delete consultation request")}
                    
        except Exception as e:
            logger.error(f"Delete consultation request error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_consultation_requests_statistics(self, lawyer_id: str = None, user_id: str = None) -> Dict[str, Any]:
        """Get statistics for consultation requests"""
        try:
            filter_clause = ""
            if lawyer_id:
                filter_clause = f"lawyer_id=eq.{lawyer_id}"  # Now references lawyer_info.lawyer_id
            elif user_id:
                filter_clause = f"user_id=eq.{user_id}"
            
            async with httpx.AsyncClient() as client:
                # Get counts for each status
                stats = {}
                statuses = ["pending", "accepted", "rejected"]
                
                for status in statuses:
                    status_filter = f"status=eq.{status}"
                    full_filter = f"{filter_clause}&{status_filter}" if filter_clause else status_filter
                    
                    response = await client.get(
                        f"{self.rest_url}/consultation_requests?select=id&{full_filter}",
                        headers=self._get_headers()
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        stats[status] = len(data)
                    else:
                        stats[status] = 0
                
                # Get total count
                total_filter = filter_clause if filter_clause else ""
                response = await client.get(
                    f"{self.rest_url}/consultation_requests?select=id&{total_filter}",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    data = response.json()
                    stats["total"] = len(data)
                else:
                    stats["total"] = 0
                
                return {"success": True, "data": stats}
                    
        except Exception as e:
            logger.error(f"Get consultation requests statistics error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test database connection"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.rest_url}/consultation_requests?select=id&limit=1",
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Connection successful"}
                else:
                    return {"success": False, "error": f"Connection failed: {response.status_code}"}
                    
        except Exception as e:
            logger.error(f"Connection test error: {str(e)}")
            return {"success": False, "error": str(e)}