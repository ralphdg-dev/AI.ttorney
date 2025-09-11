from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
import jwt
import os
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from auth.service import AuthService
from services.supabase_service import SupabaseService

router = APIRouter()
security = HTTPBearer()

class RouteValidationRequest(BaseModel):
    path: str

class RouteValidationResponse(BaseModel):
    valid: bool
    redirectTo: Optional[str] = None
    error: Optional[str] = None

# Route configurations that require server-side validation
SENSITIVE_ROUTES = {
    '/admin': {'required_role': 'admin', 'fallback': '/role-selection'},
    '/lawyer': {'required_role': 'verified_lawyer', 'fallback': '/role-selection'},
    '/lawyer/consult': {'required_role': 'verified_lawyer', 'fallback': '/lawyer'},
    '/lawyer/profile': {'required_role': 'verified_lawyer', 'fallback': '/lawyer'},
    '/home': {'required_role': 'registered_user', 'fallback': '/login'},
    '/directory': {'required_role': 'registered_user', 'fallback': '/login'},
    '/glossary': {'required_role': 'registered_user', 'fallback': '/login'},
    '/guides': {'required_role': 'registered_user', 'fallback': '/login'},
    '/chatbot': {'required_role': 'registered_user', 'fallback': '/login'},
    '/booklawyer': {'required_role': 'registered_user', 'fallback': '/login'},
}

def get_role_hierarchy_level(role: str) -> int:
    """Get the hierarchy level for a role"""
    hierarchy = {
        'guest': 0,
        'registered_user': 1,
        'verified_lawyer': 2,
        'admin': 3,
        'superadmin': 4
    }
    return hierarchy.get(role, 0)

def validate_user_access(user_role: str, required_role: str, path: str) -> bool:
    """Validate if user has access to the route based on role requirements"""
    
    # Special handling for lawyer vs user separation
    if required_role == 'verified_lawyer' and user_role != 'verified_lawyer':
        # Only verified lawyers can access lawyer routes
        return False
    
    if required_role == 'registered_user':
        # User-specific routes should not be accessible to lawyers
        user_specific_paths = ['/home', '/directory', '/glossary', '/guides', '/chatbot', '/booklawyer']
        if any(path.startswith(user_path) for user_path in user_specific_paths):
            if user_role == 'verified_lawyer':
                return False
    
    # Check minimum role requirement
    user_level = get_role_hierarchy_level(user_role)
    required_level = get_role_hierarchy_level(required_role)
    
    return user_level >= required_level

@router.post("/validate-route", response_model=RouteValidationResponse)
async def validate_route_access(
    request: RouteValidationRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Validate if the current user has access to the specified route
    """
    try:
        # Extract and verify JWT token
        token = credentials.credentials
        
        # Get user from token
        try:
            auth_service = AuthService()
            user_data = await auth_service.get_user(token)
            if not user_data or not user_data.get('profile'):
                return RouteValidationResponse(
                    valid=False,
                    error="Invalid or expired token",
                    redirectTo="/login"
                )
            user = user_data['profile']
        except Exception as e:
            return RouteValidationResponse(
                valid=False,
                error="Invalid or expired token",
                redirectTo="/login"
            )
        
        if not user:
            return RouteValidationResponse(
                valid=False,
                error="User not found",
                redirectTo="/login"
            )
        
        # Check if route requires server-side validation
        route_config = SENSITIVE_ROUTES.get(request.path)
        if not route_config:
            # Route doesn't require server validation, allow access
            return RouteValidationResponse(valid=True)
        
        # Validate user access
        user_role = user.get('role', 'guest')
        required_role = route_config['required_role']
        
        if not validate_user_access(user_role, required_role, request.path):
            return RouteValidationResponse(
                valid=False,
                error=f"Insufficient permissions. Required: {required_role}, User: {user_role}",
                redirectTo=route_config['fallback']
            )
        
        # Additional checks for lawyer verification status
        if required_role == 'verified_lawyer':
            is_verified = user.get('is_verified', False)
            if not is_verified:
                return RouteValidationResponse(
                    valid=False,
                    error="Lawyer verification required",
                    redirectTo="/onboarding/lawyer/verification-instructions"
                )
        
        # Log successful validation
        print(f"[ROUTE_VALIDATION] SUCCESS: {user.get('email')} -> {request.path}")
        
        return RouteValidationResponse(valid=True)
        
    except jwt.ExpiredSignatureError:
        return RouteValidationResponse(
            valid=False,
            error="Token expired",
            redirectTo="/login"
        )
    except jwt.InvalidTokenError:
        return RouteValidationResponse(
            valid=False,
            error="Invalid token",
            redirectTo="/login"
        )
    except Exception as e:
        print(f"[ROUTE_VALIDATION] ERROR: {str(e)}")
        return RouteValidationResponse(
            valid=False,
            error="Server validation error",
            redirectTo="/login"
        )

@router.post("/audit/route-access")
async def log_route_access(request: dict):
    """
    Log route access attempts for audit purposes
    """
    try:
        # Store audit log in database
        audit_data = {
            'timestamp': request.get('timestamp'),
            'path': request.get('path'),
            'user_email': request.get('user'),
            'user_id': request.get('userId'),
            'user_role': request.get('role'),
            'result': request.get('result'),
            'reason': request.get('reason'),
            'user_agent': request.get('userAgent')
        }
        
        # Insert into audit_logs table (create if doesn't exist)
        supabase_service = SupabaseService()
        result = supabase_service.supabase.table('audit_logs').insert(audit_data).execute()
        
        if result.data:
            return {"success": True, "message": "Audit log recorded"}
        else:
            print(f"Failed to insert audit log: {result}")
            return {"success": False, "message": "Failed to record audit log"}
            
    except Exception as e:
        print(f"Audit logging error: {str(e)}")
        return {"success": False, "message": "Audit logging failed"}

@router.post("/errors/route")
async def log_route_error(request: dict):
    """
    Log route-specific errors for monitoring
    """
    try:
        error_data = {
            'timestamp': request.get('timestamp'),
            'route': request.get('route'),
            'error_message': request.get('error'),
            'stack_trace': request.get('stack'),
            'component_stack': request.get('componentStack'),
            'route_config': request.get('routeConfig')
        }
        
        # Insert into error_logs table
        supabase_service = SupabaseService()
        result = supabase_service.supabase.table('error_logs').insert(error_data).execute()
        
        if result.data:
            return {"success": True, "message": "Error logged"}
        else:
            return {"success": False, "message": "Failed to log error"}
            
    except Exception as e:
        print(f"Error logging failed: {str(e)}")
        return {"success": False, "message": "Error logging failed"}
