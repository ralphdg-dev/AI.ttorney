"""
Enterprise Resilient Supabase Service
Handles database operations with graceful degradation and schema validation
"""

import os
import asyncio
import httpx
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging
from supabase import create_client
from .database_schema_validator import schema_validator

logger = logging.getLogger(__name__)

class ResilientSupabaseService:
    """Supabase service with enterprise-grade error handling and schema validation"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.anon_key:
            raise ValueError("Missing Supabase configuration")
        
        self.auth_url = f"{self.url}/auth/v1"
        self.rest_url = f"{self.url}/rest/v1"
        self.supabase = create_client(self.url, self.anon_key)
        
        # Schema validation cache
        self._validated_tables = set()
        
    async def ensure_table_ready(self, table_name: str) -> bool:
        """Ensures table is ready for operations"""
        if table_name in self._validated_tables:
            return True
            
        required_columns = schema_validator.get_required_columns(table_name)
        if not required_columns:
            logger.warning(f"⚠️ No schema definition for table {table_name}")
            return True
            
        is_valid = await schema_validator.ensure_schema_integrity(table_name, required_columns)
        if is_valid:
            self._validated_tables.add(table_name)
            logger.info(f"✅ Table {table_name} validated and ready")
        else:
            logger.warning(f"⚠️ Table {table_name} has schema issues, proceeding with degradation")
            self._validated_tables.add(table_name)  # Still mark as processed to avoid loops
            
        return True  # Always proceed with graceful degradation
    
    def _get_headers(self, use_service_key: bool = False) -> Dict[str, str]:
        """Get request headers with error handling"""
        try:
            key = self.service_key if use_service_key and self.service_key else self.anon_key
            return {
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json"
            }
        except Exception as e:
            logger.error(f"❌ Failed to create headers: {str(e)}")
            raise
    
    async def safe_insert(self, table_name: str, data: Dict[str, Any], use_service_key: bool = True) -> Dict[str, Any]:
        """Safe insert with schema validation and error handling"""
        try:
            # Ensure table is ready
            await self.ensure_table_ready(table_name)
            
            # Filter data to only include existing columns
            filtered_data = await self._filter_data_by_schema(table_name, data)
            
            headers = self._get_headers(use_service_key)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.rest_url}/{table_name}",
                    json=filtered_data,
                    headers=headers
                )
                
                if response.status_code in [200, 201]:
                    logger.info(f"✅ Successfully inserted into {table_name}")
                    return {"success": True, "data": response.json()}
                else:
                    logger.error(f"❌ Insert failed for {table_name}: {response.status_code} - {response.text}")
                    return {"success": False, "error": response.text, "status": response.status_code}
                    
        except Exception as e:
            logger.error(f"❌ Safe insert failed for {table_name}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def safe_select(self, table_name: str, filters: Dict[str, Any] = None, 
                         select: str = "*", use_service_key: bool = True, limit: int = None) -> Dict[str, Any]:
        """Safe select with schema validation and error handling"""
        try:
            # Ensure table is ready
            await self.ensure_table_ready(table_name)
            
            headers = self._get_headers(use_service_key)
            params = {"select": select}
            
            if filters:
                for key, value in filters.items():
                    if key.endswith("__in"):
                        # Handle IN queries
                        params[key] = f"({','.join(map(str, value))})"
                    else:
                        params[key] = f"eq.{value}"
            
            if limit:
                params["limit"] = limit
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.rest_url}/{table_name}",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    logger.info(f"✅ Successfully selected from {table_name}: {len(data)} records")
                    return {"success": True, "data": data}
                else:
                    logger.error(f"❌ Select failed for {table_name}: {response.status_code} - {response.text}")
                    return {"success": False, "error": response.text, "status": response.status_code}
                    
        except Exception as e:
            logger.error(f"❌ Safe select failed for {table_name}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def safe_update(self, table_name: str, filters: Dict[str, Any], 
                         data: Dict[str, Any], use_service_key: bool = True) -> Dict[str, Any]:
        """Safe update with schema validation and error handling"""
        try:
            # Ensure table is ready
            await self.ensure_table_ready(table_name)
            
            # Filter data to only include existing columns
            filtered_data = await self._filter_data_by_schema(table_name, data)
            
            headers = self._get_headers(use_service_key)
            params = {}
            
            # Build filter parameters
            for key, value in filters.items():
                params[key] = f"eq.{value}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.patch(
                    f"{self.rest_url}/{table_name}",
                    params=params,
                    json=filtered_data,
                    headers=headers
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ Successfully updated {table_name}")
                    return {"success": True, "data": response.json()}
                else:
                    logger.error(f"❌ Update failed for {table_name}: {response.status_code} - {response.text}")
                    return {"success": False, "error": response.text, "status": response.status_code}
                    
        except Exception as e:
            logger.error(f"❌ Safe update failed for {table_name}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _filter_data_by_schema(self, table_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Filter data to only include columns that exist in the table"""
        try:
            # Get table schema
            validation = await schema_validator.validate_table_schema(
                table_name, 
                schema_validator.get_required_columns(table_name)
            )
            
            if validation.get("valid") and validation.get("existing_columns"):
                existing_columns = set(validation["existing_columns"])
                filtered_data = {k: v for k, v in data.items() if k in existing_columns}
                
                removed_keys = set(data.keys()) - existing_columns
                if removed_keys:
                    logger.info(f"🔧 Filtered out non-existent columns for {table_name}: {removed_keys}")
                
                return filtered_data
            else:
                # If schema validation fails, return original data
                logger.warning(f"⚠️ Could not validate schema for {table_name}, using original data")
                return data
                
        except Exception as e:
            logger.error(f"❌ Schema filtering failed for {table_name}: {str(e)}")
            return data
    
    async def create_user_profile_resilient(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create user profile with maximum resilience to schema issues"""
        try:
            # Debug: Log the actual user_data structure
            logger.info(f"🔍 DEBUG: user_data structure: {user_data}")
            
            # Ensure users table is ready
            await self.ensure_table_ready("users")
            
            # Prepare base user data with only essential fields
            # Use the role from user_metadata, not from auth user data
            user_role = user_data.get("role", "guest")
            # Ensure we don't use 'authenticated' which isn't in the database enum
            if user_role == "authenticated":
                user_role = "guest"
                
            essential_data = {
                "id": user_data.get("id"),
                "email": user_data.get("email"),
                "role": user_role,
                "created_at": datetime.now().isoformat()
            }
            
            # Add optional fields if they exist
            optional_fields = ["username", "full_name", "first_name", "last_name", "birthdate"]
            for field in optional_fields:
                if field in user_data and user_data[field]:
                    essential_data[field] = user_data[field]
                    logger.info(f"🔍 DEBUG: Added {field}: {user_data[field]}")
                else:
                    logger.warning(f"⚠️ DEBUG: Missing or empty {field} in user_data")
            
            # CRITICAL FIX: Use direct Supabase client for user creation to bypass REST API schema issues
            logger.info(f"🔧 DEBUG: Using direct Supabase client for user creation: {essential_data}")
            
            try:
                # Use the direct Supabase client which handles schema validation differently
                insert_result = self.supabase.table("users").insert(essential_data).execute()
                
                if insert_result.data:
                    logger.info(f"✅ Successfully created user profile via direct client")
                    result = {"success": True, "data": insert_result.data}
                else:
                    logger.error(f"❌ Direct client insert failed: {insert_result}")
                    result = {"success": False, "error": "Direct client insert returned no data"}
                    
            except Exception as direct_error:
                logger.warning(f"⚠️ Direct client failed, trying REST API without schema validation: {str(direct_error)}")
                
                # Final fallback: Try REST API with ONLY the fields that actually exist in the database
                minimal_data = {
                    "id": essential_data.get("id"),
                    "email": essential_data.get("email"),
                    "role": essential_data.get("role", "guest"),
                    "auth_provider": "email",  # Required based on schema
                    "email_verified": False,   # Required based on schema
                    "created_at": essential_data.get("created_at")
                }
                # Remove username since it's not in the actual database schema
                logger.warning(f"⚠️ REMOVED username - not in actual database schema")
                
                logger.info(f"🔧 DEBUG: Final fallback with minimal data: {minimal_data}")
                
                headers = self._get_headers(use_service_key=True)
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.rest_url}/users",
                        json=minimal_data,
                        headers=headers
                    )
                    
                    if response.status_code in [200, 201]:
                        logger.info(f"✅ Successfully inserted minimal user profile")
                        result = {"success": True, "data": response.json()}
                    else:
                        logger.error(f"❌ Minimal insert failed: {response.status_code} - {response.text}")
                        result = {"success": False, "error": response.text, "status": response.status_code}
            
            if result["success"]:
                logger.info(f"✅ User profile created successfully: {user_data.get('email')}")
                return {"success": True, "user_id": user_data.get("id")}
            else:
                logger.error(f"❌ User profile creation failed: {result.get('error')}")
                return {"success": False, "error": result.get("error")}
                
        except Exception as e:
            logger.error(f"❌ Resilient user profile creation failed: {str(e)}")
            return {"success": False, "error": str(e)}

# Global resilient service instance
resilient_supabase = ResilientSupabaseService()
