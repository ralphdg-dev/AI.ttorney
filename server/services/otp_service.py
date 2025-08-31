import os
import random
import string
import hashlib
from typing import Dict, Any, Optional
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import redis.asyncio as redis
import json
import asyncio

logger = logging.getLogger(__name__)

class OTPService:
    def __init__(self):
        # SMTP Configuration
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@ai.ttorney.com")
        self.from_name = os.getenv("FROM_NAME", "AI.ttorney")
        
        # Initialize Redis connection
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
        
    async def _ensure_redis_connection(self):
        """Ensure Redis connection is established"""
        try:
            await self.redis_client.ping()
            logger.info("✅ Redis connection established")
        except Exception as e:
            logger.error(f"Redis connection failed: {str(e)}")
            raise
        
    def generate_otp(self, length: int = 6) -> str:
        """Generate a random OTP code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def hash_otp(self, otp_code: str) -> str:
        """Hash OTP code using SHA-256"""
        return hashlib.sha256(otp_code.encode()).hexdigest()
    
    def get_redis_key(self, email: str, otp_type: str) -> str:
        """Generate Redis key for OTP storage"""
        return f"otp:{otp_type}:{email}"
    
    def get_attempts_key(self, email: str, otp_type: str) -> str:
        """Generate Redis key for OTP attempt tracking"""
        return f"otp_attempts:{otp_type}:{email}"
    
    def get_lockout_key(self, email: str, otp_type: str) -> str:
        """Generate Redis key for OTP lockout tracking"""
        return f"otp_lockout:{otp_type}:{email}"
    
    async def send_verification_otp(self, email: str, user_name: str = "User") -> Dict[str, Any]:
        """Send OTP for email verification"""
        try:
            await self._ensure_redis_connection()
            
            # Generate OTP
            otp_code = self.generate_otp()
            ttl_seconds = 120  # 2 minutes
            
            # Hash the OTP
            otp_hash = self.hash_otp(otp_code)
            
            # Store hash in Redis with TTL
            redis_key = self.get_redis_key(email, "email_verification")
            otp_data = {
                "hash": otp_hash,
                "email": email,
                "type": "email_verification"
            }
            
            await self.redis_client.setex(redis_key, ttl_seconds, json.dumps(otp_data))
            
            # Reset attempt counter when new OTP is sent
            attempts_key = self.get_attempts_key(email, "email_verification")
            await self.redis_client.delete(attempts_key)
            
            # Clear any existing lockout
            lockout_key = self.get_lockout_key(email, "email_verification")
            await self.redis_client.delete(lockout_key)
            logger.info(f"OTP stored in Redis with key: {redis_key}, TTL: {ttl_seconds}s")
            
            # Send email via Resend
            email_response = await self.send_otp_email(email, otp_code, user_name, "verification")
            
            if email_response["success"]:
                return {
                    "success": True,
                    "message": "Verification OTP sent successfully",
                    "expires_in_minutes": 2
                }
            else:
                return {"success": False, "error": email_response["error"]}
                
        except Exception as e:
            logger.error(f"Send verification OTP error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_password_reset_otp(self, email: str, user_name: str = "User") -> Dict[str, Any]:
        """Send OTP for password reset"""
        try:
            await self._ensure_redis_connection()
            
            # Generate OTP
            otp_code = self.generate_otp()
            ttl_seconds = 120  # 2 minutes
            
            # Hash the OTP
            otp_hash = self.hash_otp(otp_code)
            
            # Store hash in Redis with TTL
            redis_key = self.get_redis_key(email, "password_reset")
            otp_data = {
                "hash": otp_hash,
                "email": email,
                "type": "password_reset"
            }
            
            await self.redis_client.setex(redis_key, ttl_seconds, json.dumps(otp_data))
            
            # Reset attempt counter when new OTP is sent
            attempts_key = self.get_attempts_key(email, "password_reset")
            await self.redis_client.delete(attempts_key)
            
            # Clear any existing lockout
            lockout_key = self.get_lockout_key(email, "password_reset")
            await self.redis_client.delete(lockout_key)
            logger.info(f"OTP stored in Redis with key: {redis_key}, TTL: {ttl_seconds}s")
            
            # Send email via Resend
            email_response = await self.send_otp_email(email, otp_code, user_name, "password_reset")
            
            if email_response["success"]:
                return {
                    "success": True,
                    "message": "Password reset OTP sent successfully",
                    "expires_in_minutes": 2
                }
            else:
                return {"success": False, "error": email_response["error"]}
                
        except Exception as e:
            logger.error(f"Send password reset OTP error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def verify_otp(self, email: str, otp_code: str, otp_type: str) -> Dict[str, Any]:
        """Verify OTP code with attempt tracking and lockout"""
        try:
            await self._ensure_redis_connection()
            
            # Check if user is locked out
            lockout_key = self.get_lockout_key(email, otp_type)
            lockout_data = await self.redis_client.get(lockout_key)
            
            if lockout_data:
                lockout_info = json.loads(lockout_data)
                remaining_time = await self.redis_client.ttl(lockout_key)
                return {
                    "success": False, 
                    "error": f"Too many failed attempts. Please try again in {remaining_time // 60} minutes and {remaining_time % 60} seconds.",
                    "locked_out": True,
                    "retry_after": remaining_time
                }
            
            # Get Redis key for OTP
            redis_key = self.get_redis_key(email, otp_type)
            
            # Get stored OTP data from Redis
            stored_data = await self.redis_client.get(redis_key)
            
            if not stored_data:
                return {"success": False, "error": "OTP not found or expired"}
            
            # Parse stored data
            otp_data = json.loads(stored_data)
            stored_hash = otp_data["hash"]
            
            # Hash the provided OTP
            provided_hash = self.hash_otp(otp_code)
            
            # Get current attempt count
            attempts_key = self.get_attempts_key(email, otp_type)
            current_attempts = await self.redis_client.get(attempts_key)
            attempt_count = int(current_attempts) if current_attempts else 0
            
            # Compare hashes
            if stored_hash != provided_hash:
                # Increment attempt counter
                attempt_count += 1
                await self.redis_client.setex(attempts_key, 300, str(attempt_count))  # 5 minutes TTL for attempts
                
                # Check if max attempts reached
                if attempt_count >= 5:
                    # Set lockout for 15 minutes
                    lockout_data = {
                        "email": email,
                        "attempts": attempt_count,
                        "locked_at": asyncio.get_event_loop().time()
                    }
                    await self.redis_client.setex(lockout_key, 900, json.dumps(lockout_data))  # 15 minutes lockout
                    
                    # Delete the OTP and attempts to prevent further use
                    await self.redis_client.delete(redis_key)
                    await self.redis_client.delete(attempts_key)
                    
                    logger.warning(f"User {email} locked out after {attempt_count} failed OTP attempts")
                    
                    return {
                        "success": False, 
                        "error": "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
                        "locked_out": True,
                        "retry_after": 900
                    }
                
                remaining_attempts = 5 - attempt_count
                return {
                    "success": False, 
                    "error": f"Invalid OTP code. {remaining_attempts} attempt(s) remaining.",
                    "attempts_remaining": remaining_attempts
                }
            
            # OTP is correct - delete OTP and attempts from Redis
            await self.redis_client.delete(redis_key)
            await self.redis_client.delete(attempts_key)
            logger.info(f"OTP verified and deleted from Redis: {redis_key}")
            
            return {
                "success": True,
                "message": "OTP verified successfully"
            }
            
        except Exception as e:
            logger.error(f"Verify OTP error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_otp_email(self, email: str, otp_code: str, user_name: str, otp_type: str) -> Dict[str, Any]:
        """Send OTP email using SMTP"""
        try:
            if otp_type == "verification":
                subject = "Verify Your AI.ttorney Account"
                html_content = self.get_verification_email_template(otp_code, user_name)
            elif otp_type == "password_reset":
                subject = "Reset Your AI.ttorney Password"
                html_content = self.get_password_reset_email_template(otp_code, user_name)
            else:
                return {"success": False, "error": "Invalid OTP type"}
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = email
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                text = message.as_string()
                server.sendmail(self.from_email, [email], text)
            
            logger.info(f"OTP email sent successfully to {email}")
            
            return {
                "success": True,
                "message": "OTP email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Send OTP email error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def get_verification_email_template(self, otp_code: str, user_name: str) -> str:
        """HTML template for verification email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your Account</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Welcome to AI.ttorney!</h2>
                <p>Hi {user_name},</p>
                <p>Thank you for registering with AI.ttorney. To complete your account verification, please use the following OTP code:</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 8px;">{otp_code}</h1>
                </div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't create an account with AI.ttorney, please ignore this email.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    Best regards,<br>
                    The AI.ttorney Team
                </p>
            </div>
        </body>
        </html>
        """
    
    def get_password_reset_email_template(self, otp_code: str, user_name: str) -> str:
        """HTML template for password reset email"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #dc2626;">Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your AI.ttorney account password. Use the following OTP code to proceed:</p>
                
                <div style="background-color: #fef2f2; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #fecaca;">
                    <h1 style="color: #dc2626; font-size: 32px; margin: 0; letter-spacing: 8px;">{otp_code}</h1>
                </div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    Best regards,<br>
                    The AI.ttorney Team
                </p>
            </div>
        </body>
        </html>
        """
    
