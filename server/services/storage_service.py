import httpx
import os
import uuid
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import logging
from fastapi import UploadFile
import mimetypes

load_dotenv()
logger = logging.getLogger(__name__)

class StorageService:
    """Service for handling Supabase storage operations"""
    
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.service_key:
            raise ValueError("Missing Supabase configuration")
        
        self.storage_url = f"{self.url}/storage/v1"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers for storage operations"""
        return {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key
        }
    
    async def upload_ibp_id_card(self, file: UploadFile, user_id: str) -> Dict[str, Any]:
        """Upload IBP ID card to ibp-ids bucket"""
        return await self._upload_file(file, "ibp-ids", user_id, "ibp_id")
    
    async def upload_selfie(self, file: UploadFile, user_id: str) -> Dict[str, Any]:
        """Upload selfie to selfie-ids bucket"""
        return await self._upload_file(file, "selfie-ids", user_id, "selfie")
    
    async def _upload_file(self, file: UploadFile, bucket: str, user_id: str, file_type: str) -> Dict[str, Any]:
        """Generic file upload method"""
        try:
                                
            if not self._is_valid_image(file):
                return {
                    "success": False,
                    "error": "Invalid file type. Only images are allowed."
                }
            
                                                                                                         
            import time
            timestamp = int(time.time() * 1000)                
            random_suffix = uuid.uuid4().hex[:6]                        
            file_extension = self._get_file_extension(file.filename)
            filename = f"{timestamp}_{timestamp}-{random_suffix}{file_extension}"
            
                               
            file_content = await file.read()
            
                                                    
            await file.seek(0)
            
                                        
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.storage_url}/object/{bucket}/{filename}",
                    content=file_content,
                    headers={
                        **self._get_headers(),
                        "Content-Type": file.content_type or "application/octet-stream"
                    }
                )
                
                if response.status_code in [200, 201]:
                                                                                     
                    return {
                        "success": True,
                        "file_path": filename,
                        "message": f"{file_type.replace('_', ' ').title()} uploaded successfully"
                    }
                else:
                    error_data = response.json() if response.content else {}
                    logger.error(f"Storage upload failed: {response.status_code}, {error_data}")
                    return {
                        "success": False,
                        "error": f"Upload failed: {error_data.get('message', 'Unknown error')}"
                    }
                    
        except Exception as e:
            logger.error(f"Upload file error: {str(e)}")
            return {
                "success": False,
                "error": f"Upload failed: {str(e)}"
            }
    
    def _is_valid_image(self, file: UploadFile) -> bool:
        """Check if file is a valid image"""
        if not file.content_type:
            return False
        
        allowed_types = [
            "image/jpeg",
            "image/jpg", 
            "image/png",
            "image/webp"
        ]
        
        return file.content_type.lower() in allowed_types
    
    def _get_file_extension(self, filename: str) -> str:
        """Get file extension from filename"""
        if not filename:
            return ""
        
                                     
        _, ext = os.path.splitext(filename)
        return ext.lower() if ext else ""
