"""
Auth Service Resilient Wrapper
Adds enterprise-grade resilience to existing auth service with minimal disruption
"""

import logging
from typing import Dict, Any
from .enhanced_auth_service import enhanced_auth

logger = logging.getLogger(__name__)

class AuthResilientWrapper:
    """Wrapper that adds resilience to existing auth operations"""
    
    def __init__(self, existing_auth_service):
        self.existing_auth_service = existing_auth_service
        self.fallback_enabled = True
        
    async def sign_up_resilient(self, user_data) -> Dict[str, Any]:
        """Signup with automatic fallback to resilient method"""
        try:
            logger.info("🚀 Attempting signup with existing auth service")
            
            # Try existing method first
            if hasattr(self.existing_auth_service, 'sign_up'):
                result = await self.existing_auth_service.sign_up(user_data)
                if result.get("success"):
                    logger.info("✅ Existing auth service signup successful")
                    return result
                else:
                    logger.warning(f"⚠️ Existing auth service failed: {result.get('error')}")
            else:
                logger.warning("⚠️ Existing auth service doesn't have sign_up method")
            
            # Fallback to resilient method if enabled
            if self.fallback_enabled:
                logger.info("🔄 Falling back to resilient auth service")
                return await self._fallback_signup(user_data)
            else:
                return {"success": False, "error": "Signup failed and fallback disabled"}
                
        except Exception as e:
            logger.error(f"❌ Auth wrapper exception: {str(e)}")
            if self.fallback_enabled:
                logger.info("🔄 Falling back to resilient auth service due to exception")
                return await self._fallback_signup(user_data)
            else:
                return {"success": False, "error": str(e)}
    
    async def _fallback_signup(self, user_data) -> Dict[str, Any]:
        """Fallback signup using enhanced resilient auth"""
        try:
            # Extract user data from the existing model
            email = getattr(user_data, 'email', None)
            password = getattr(user_data, 'password', None)
            
            logger.info(f"🔍 DEBUG WRAPPER: Original user_data type: {type(user_data)}")
            logger.info(f"🔍 DEBUG WRAPPER: Original user_data: {user_data}")
            
            # Build user metadata from existing fields
            user_metadata = {}
            metadata_fields = ['first_name', 'last_name', 'full_name', 'username', 'birthdate', 'role']
            
            for field in metadata_fields:
                if hasattr(user_data, field):
                    value = getattr(user_data, field)
                    if value:
                        # Convert date objects to strings for JSON serialization
                        if field == 'birthdate' and hasattr(value, 'isoformat'):
                            user_metadata[field] = value.isoformat()
                        else:
                            user_metadata[field] = value
                        logger.info(f"🔍 DEBUG WRAPPER: Added {field}: {user_metadata[field]}")
                else:
                    logger.warning(f"⚠️ DEBUG WRAPPER: Missing field {field}")
            
            logger.info(f"🔍 DEBUG WRAPPER: Final user_metadata: {user_metadata}")
            
            # Use enhanced auth service
            result = await enhanced_auth.signup_user_resilient(email, password, user_metadata)
            
            if result["success"]:
                logger.info("✅ Resilient fallback signup successful")
            else:
                logger.error(f"❌ Resilient fallback signup failed: {result.get('error')}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Resilient fallback exception: {str(e)}")
            return {"success": False, "error": f"Fallback failed: {str(e)}"}
    
    def disable_fallback(self):
        """Disable fallback mechanism (for testing)"""
        self.fallback_enabled = False
        logger.info("⚠️ Auth fallback disabled")
    
    def enable_fallback(self):
        """Enable fallback mechanism"""
        self.fallback_enabled = True
        logger.info("✅ Auth fallback enabled")

# Factory function to create wrapped auth service
def create_resilient_auth_service(existing_auth_service):
    """Create a resilient wrapper around existing auth service"""
    return AuthResilientWrapper(existing_auth_service)
