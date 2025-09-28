import httpx
import os
import json
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv
import logging
from supabase import create_client, Client
from datetime import datetime

from services.supabase_service import SupabaseService

load_dotenv()
logger = logging.getLogger(__name__)

class LegalConsultAction:
    """Backend action for fetching consultation requests for lawyers"""
    
    def __init__(self, supabase_service: SupabaseService):
        self.supabase_service = supabase_service
    
    async def get_consultation_requests(self, lawyer_id: str, access_token: str) -> Dict[str, Any]:
        """
        Fetch consultation requests for a specific lawyer with user names resolved
        
        Args:
            lawyer_id: The ID of the logged-in lawyer
            access_token: JWT access token for authentication
            
        Returns:
            Dictionary with success status and consultation requests data
        """
        try:
            # First verify the user is authenticated and is the same lawyer
            user_result = await self.supabase_service.get_user(access_token)
            if not user_result["success"]:
                return {"success": False, "error": "Authentication failed"}
            
            authenticated_user_id = user_result["data"]["id"]
            
            # Verify the authenticated user matches the requested lawyer_id
            if authenticated_user_id != lawyer_id:
                return {"success": False, "error": "Unauthorized access to consultation requests"}
            
            # Fetch consultation requests for this lawyer with user information
            consultation_requests = await self._fetch_consultation_requests_with_users(lawyer_id)
            
            return {
                "success": True, 
                "data": consultation_requests,
                "message": f"Found {len(consultation_requests)} consultation requests"
            }
            
        except Exception as e:
            logger.error(f"Error fetching consultation requests: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _fetch_consultation_requests_with_users(self, lawyer_id: str) -> List[Dict[str, Any]]:
        """
        Fetch consultation requests and join with users table to get client names
        
        Args:
            lawyer_id: The lawyer's ID to filter requests
            
        Returns:
            List of consultation requests with user information
        """
        try:
            # Using Supabase client for complex queries
            response = self.supabase_service.supabase.table('consultation_requests') \
                .select('''
                    *,
                    users:user_id (
                        id,
                        first_name,
                        last_name,
                        email,
                        avatar_url
                    )
                ''') \
                .eq('lawyer_id', lawyer_id) \
                .order('requested_at', desc=True) \
                .execute()
            
            if hasattr(response, 'error') and response.error:
                logger.error(f"Supabase query error: {response.error}")
                return []
            
            requests_data = response.data if hasattr(response, 'data') else []
            
            # Format the data for frontend consumption
            formatted_requests = []
            for request in requests_data:
                formatted_request = self._format_consultation_request(request)
                formatted_requests.append(formatted_request)
            
            return formatted_requests
            
        except Exception as e:
            logger.error(f"Error in consultation request query: {str(e)}")
            return []
    
    def _format_consultation_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format consultation request data for frontend
        
        Args:
            request_data: Raw consultation request data from database
            
        Returns:
            Formatted consultation request
        """
        # Get client information from joined users table
        user_data = request_data.get('users', {})
        first_name = user_data.get('first_name', '')
        last_name = user_data.get('last_name', '')
        client_name = f"{first_name} {last_name}".strip() or "Unknown Client"
        
        # Generate avatar URL or use default
        avatar_url = user_data.get('avatar_url') or self._generate_default_avatar(client_name)
        
        # Format dates for frontend
        requested_at = self._format_timestamp(request_data.get('requested_at'))
        responded_at = self._format_timestamp(request_data.get('responded_at'))
        
        # Determine consultation mode based on available data
        consultation_mode = request_data.get('consultation_mode', 'online')
        if consultation_mode not in ['online', 'onsite']:
            # Infer from available fields or default to online
            consultation_mode = 'online'
        
        return {
            'id': request_data.get('id'),
            'client': {
                'name': client_name,
                'avatar': avatar_url,
                'email': user_data.get('email', ''),
                'user_id': user_data.get('id')
            },
            'message': request_data.get('message', ''),
            'mode': consultation_mode,
            'status': request_data.get('status', 'pending'),
            'requested_at': requested_at,
            'consultation_date': request_data.get('consultation_date'),
            'consultation_time': request_data.get('consultation_time'),
            'user_id': request_data.get('user_id'),
            'lawyer_id': request_data.get('lawyer_id'),
            'responded_at': responded_at,
            'email': request_data.get('email', ''),
            'mobile_number': request_data.get('mobile_numb', ''),
            'created_at': request_data.get('created_at'),
            'updated_at': request_data.get('updated_at')
        }
    
    def _format_timestamp(self, timestamp: Any) -> Optional[str]:
        """Format timestamp for relative time display"""
        if not timestamp:
            return None
        
        try:
            # If it's already a string, parse it
            if isinstance(timestamp, str):
                # Handle different timestamp formats
                if 'T' in timestamp:
                    dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                else:
                    dt = datetime.strptime(timestamp, '%Y-%m-%d %H:%M:%S')
            else:
                dt = timestamp
            
            now = datetime.now()
            diff = now - dt if isinstance(dt, datetime) else now - datetime.fromisoformat(str(dt))
            
            # Calculate relative time
            seconds = diff.total_seconds()
            if seconds < 60:
                return "just now"
            elif seconds < 3600:
                minutes = int(seconds / 60)
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            elif seconds < 86400:
                hours = int(seconds / 3600)
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
            else:
                days = int(seconds / 86400)
                return f"{days} day{'s' if days > 1 else ''} ago"
                
        except Exception as e:
            logger.warning(f"Error formatting timestamp {timestamp}: {str(e)}")
            return None
    
    def _generate_default_avatar(self, name: str) -> str:
        """Generate a default avatar URL based on client name"""
        # You can use a service like DiceBear or generate initials
        initials = ''.join([word[0].upper() for word in name.split()[:2]]) if name.strip() else 'U'
        # Using DiceBear avatars with initials
        return f"https://api.dicebear.com/7.x/initials/svg?seed={initials}&backgroundColor=0080ff&textColor=ffffff"
    
    async def update_consultation_status(self, request_id: str, lawyer_id: str, 
                                       new_status: str, access_token: str) -> Dict[str, Any]:
        """
        Update consultation request status (accept, complete, etc.)
        
        Args:
            request_id: Consultation request ID
            lawyer_id: Lawyer ID for verification
            new_status: New status to set
            access_token: JWT access token
            
        Returns:
            Dictionary with success status
        """
        try:
            # Verify authentication and authorization
            user_result = await self.supabase_service.get_user(access_token)
            if not user_result["success"]:
                return {"success": False, "error": "Authentication failed"}
            
            authenticated_user_id = user_result["data"]["id"]
            if authenticated_user_id != lawyer_id:
                return {"success": False, "error": "Unauthorized action"}
            
            # Verify the request belongs to this lawyer
            verification_response = self.supabase_service.supabase.table('consultation_requests') \
                .select('id') \
                .eq('id', request_id) \
                .eq('lawyer_id', lawyer_id) \
                .execute()
            
            if hasattr(verification_response, 'error') and verification_response.error:
                return {"success": False, "error": "Request verification failed"}
            
            if not verification_response.data:
                return {"success": False, "error": "Consultation request not found or unauthorized"}
            
            # Update the status
            update_data = {
                'status': new_status,
                'responded_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            update_response = self.supabase_service.supabase.table('consultation_requests') \
                .update(update_data) \
                .eq('id', request_id) \
                .execute()
            
            if hasattr(update_response, 'error') and update_response.error:
                logger.error(f"Update error: {update_response.error}")
                return {"success": False, "error": "Failed to update consultation status"}
            
            return {"success": True, "message": f"Consultation status updated to {new_status}"}
            
        except Exception as e:
            logger.error(f"Error updating consultation status: {str(e)}")
            return {"success": False, "error": str(e)}


# Example usage with FastAPI endpoint
from fastapi import APIRouter, HTTPException, Header, Depends

router = APIRouter()

def get_supabase_service():
    return SupabaseService()

def get_legal_consult_action(supabase_service: SupabaseService = Depends(get_supabase_service)):
    return LegalConsultAction(supabase_service)

@router.get("/api/lawyer/consultation-requests")
async def get_consultation_requests(
    lawyer_id: str,
    authorization: str = Header(...),
    legal_consult_action: LegalConsultAction = Depends(get_legal_consult_action)
):
    """
    Get consultation requests for a lawyer
    """
    # Extract token from Authorization header (Bearer token)
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    result = await legal_consult_action.get_consultation_requests(lawyer_id, token)
    
    if not result["success"]:
        raise HTTPException(status_code=403, detail=result["error"])
    
    return result

@router.post("/api/lawyer/consultation-requests/{request_id}/status")
async def update_consultation_status(
    request_id: str,
    lawyer_id: str,
    new_status: str,
    authorization: str = Header(...),
    legal_consult_action: LegalConsultAction = Depends(get_legal_consult_action)
):
    """
    Update consultation request status
    """
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    result = await legal_consult_action.update_consultation_status(
        request_id, lawyer_id, new_status, token
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result