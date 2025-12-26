import os
import random
import string
import hashlib
from typing import Dict, Any, Optional
import logging
from config.timeout_config import get_timeout, create_httpx_timeout, get_timeout_bundle

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import asyncio
import time
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

@dataclass
class OTPData:
    """Data structure for storing OTP information"""
    hash: str
    email: str
    otp_type: str
    expires_at: float
    attempts: int = 0
    locked_until: Optional[float] = None

class InMemoryOTPStore:
    """Thread-safe in-memory OTP storage with automatic cleanup"""
    
    def __init__(self):
        self._store: Dict[str, OTPData] = {}
        self._lock = threading.RLock()
        self._cleanup_thread = None
        self._stop_cleanup = threading.Event()
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        """Start the background cleanup thread"""
        if self._cleanup_thread is None or not self._cleanup_thread.is_alive():
            self._cleanup_thread = threading.Thread(target=self._cleanup_expired, daemon=True)
            self._cleanup_thread.start()
            logger.info("OTP cleanup thread started")
    
    def _cleanup_expired(self):
        """Background thread to clean up expired OTPs"""
        while not self._stop_cleanup.wait(30):                          
            current_time = time.time()
            with self._lock:
                expired_keys = []
                for key, otp_data in self._store.items():
                    if current_time > otp_data.expires_at:
                        expired_keys.append(key)
                    elif otp_data.locked_until and current_time > otp_data.locked_until:
                                                                   
                        otp_data.locked_until = None
                        otp_data.attempts = 0
                
                for key in expired_keys:
                    del self._store[key]
                
                if expired_keys:
                    logger.info(f"Cleaned up {len(expired_keys)} expired OTPs")
    
    def store_otp(self, key: str, otp_data: OTPData):
        """Store OTP data with thread safety"""
        with self._lock:
            self._store[key] = otp_data
    
    def get_otp(self, key: str) -> Optional[OTPData]:
        """Get OTP data if exists and not expired"""
        with self._lock:
            otp_data = self._store.get(key)
            if otp_data and time.time() <= otp_data.expires_at:
                return otp_data
            elif otp_data:
                                    
                del self._store[key]
            return None
    
    def delete_otp(self, key: str):
        """Delete OTP data"""
        with self._lock:
            self._store.pop(key, None)
    
    def update_attempts(self, key: str, attempts: int, locked_until: Optional[float] = None):
        """Update attempt count and lockout status"""
        with self._lock:
            if key in self._store:
                self._store[key].attempts = attempts
                if locked_until:
                    self._store[key].locked_until = locked_until
    
    def is_locked(self, key: str) -> tuple[bool, Optional[float]]:
        """Check if OTP is locked and return remaining lockout time"""
        with self._lock:
            otp_data = self._store.get(key)
            if otp_data and otp_data.locked_until:
                current_time = time.time()
                if current_time < otp_data.locked_until:
                    return True, otp_data.locked_until - current_time
                else:
                                               
                    otp_data.locked_until = None
                    otp_data.attempts = 0
            return False, None
    
    def clear_lockout(self, key: str):
        """Clear lockout and reset attempts"""
        with self._lock:
            if key in self._store:
                self._store[key].locked_until = None
                self._store[key].attempts = 0
    
    def shutdown(self):
        """Shutdown the cleanup thread"""
        self._stop_cleanup.set()
        if self._cleanup_thread and self._cleanup_thread.is_alive():
            self._cleanup_thread.join(timeout=5)

                            
_global_otp_store = None

def get_otp_store():
    """Get the global OTP store singleton"""
    global _global_otp_store
    if _global_otp_store is None:
        _global_otp_store = InMemoryOTPStore()
    return _global_otp_store

class OTPService:
    def __init__(self):
        # Support both legacy and current SMTP environment variable names
        self.smtp_server = (
            os.getenv("SMTP_HOST")
            or os.getenv("SMTP_SERVER")
            or "smtp.gmail.com"
        )
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USER") or os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.from_email = (
            os.getenv("FROM_EMAIL")
            or os.getenv("EMAIL_FROM")
            or "noreply@ai.ttorney.com"
        )
        self.from_name = os.getenv("FROM_NAME", "AI.ttorney")
        
                                                                 
        logger.info(f"OTP Service initialized with SMTP server: {self.smtp_server}:{self.smtp_port}")
        logger.info(f"SMTP username configured: {'Yes' if self.smtp_username else 'No'}")
        logger.info(f"SMTP password configured: {'Yes' if self.smtp_password else 'No'}")
        logger.info(f"From email: {self.from_email}")
        
                                        
        self.otp_store = get_otp_store()
        
    def generate_otp(self, length: int = 6) -> str:
        """Generate a random OTP code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def hash_otp(self, otp_code: str) -> str:
        """Hash OTP code using SHA-256"""
        return hashlib.sha256(otp_code.encode()).hexdigest()
    
    def get_otp_key(self, email: str, otp_type: str) -> str:
        """Generate key for OTP storage with normalized email"""
                                                            
        normalized_email = email.lower().strip()
        return f"otp:{otp_type}:{normalized_email}"
    
                                 
    OTP_TTL_SECONDS = 120                               
    OTP_TTL_MINUTES = 2
    
                            
    OTP_TYPES = {
        "email_verification": {
            "email_template": "verification",
            "success_message": "Verification OTP sent successfully",
            "log_prefix": "Email verification"
        },
        "password_reset": {
            "email_template": "password_reset", 
            "success_message": "Password reset OTP sent successfully",
            "log_prefix": "Password reset"
        },
        "email_change": {
            "email_template": "email_change",
            "success_message": "Email change verification OTP sent successfully", 
            "log_prefix": "Email change"
        }
    }
    
    async def _send_otp_core(self, email: str, otp_type: str, user_name: str = "User") -> Dict[str, Any]:
        """Core OTP sending logic - DRY implementation"""
        try:
            logger.info(f"🔵 _send_otp_core called with email: {email}, otp_type: {otp_type}, user_name: '{user_name}'")
            
            # Validate email
            if not email or '@' not in email or '.' not in email:
                logger.error(f"Invalid email format in _send_otp_core: {email}")
                return {"success": False, "error": "Invalid email address format"}
                
            # Validate OTP type
            if otp_type not in self.OTP_TYPES:
                logger.error(f"Invalid OTP type: {otp_type}")
                return {"success": False, "error": f"Invalid OTP type: {otp_type}"}
            
            # Get OTP type configuration
            config = self.OTP_TYPES[otp_type]
            logger.info(f"✅ OTP type config: {config}")
            
            # Ensure user_name is not None or empty
            if not user_name or user_name.strip() == "":
                user_name = "User"
                logger.warning(f"Empty user_name provided for {email}, using default: 'User'")
            
            # Generate OTP code and hash
            otp_code = self.generate_otp()
            otp_hash = self.hash_otp(otp_code)
            logger.info(f"✅ OTP code generated (hash: {otp_hash[:8]}...)")
            
            # Create OTP key and data
            otp_key = self.get_otp_key(email, otp_type)
            otp_data = OTPData(
                hash=otp_hash,
                email=email,
                otp_type=otp_type,
                expires_at=time.time() + self.OTP_TTL_SECONDS,
                attempts=0,
                locked_until=None
            )
            
            # Store OTP in memory
            self.otp_store.store_otp(otp_key, otp_data)
            logger.info(f"✅ {config['log_prefix']} OTP stored with key: {otp_key}, expires in: {self.OTP_TTL_SECONDS}s")
            
            # Log current OTP store state (debug)
            with self.otp_store._lock:
                store_keys = list(self.otp_store._store.keys())
                logger.info(f"📦 OTP store now contains {len(store_keys)} keys: {store_keys}")
            
            # Send OTP email
            logger.info(f"📧 Attempting to send {otp_type} OTP to {email} with user_name: '{user_name}'")
            email_response = await self.send_otp_email(email, otp_code, user_name, config["email_template"])
            logger.info(f"📧 Email send response: {email_response}")
            
            if email_response["success"]:
                logger.info(f"✅✅✅ Successfully sent {otp_type} OTP to {email}")
                result = {
                    "success": True,
                    "message": config["success_message"],
                    "expires_in_minutes": self.OTP_TTL_MINUTES
                }
                logger.info(f"✅ Returning result: {result}")
                return result
            else:
                logger.error(f"❌ Failed to send {otp_type} OTP to {email}: {email_response['error']}")
                # If email sending fails, remove the OTP from store to prevent orphaned entries
                self.otp_store.delete_otp(otp_key)
                return {"success": False, "error": email_response["error"]}
                
        except ValueError as ve:
            logger.error(f"❌ Validation error in _send_otp_core: {str(ve)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {"success": False, "error": str(ve)}
        except Exception as e:
            logger.error(f"❌❌❌ Unexpected error in _send_otp_core")
            logger.error(f"❌ Error: {str(e)}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return {"success": False, "error": "Failed to process verification request. Please try again later."}

    
    async def send_verification_otp(self, email: str, user_name: str = "User") -> Dict[str, Any]:
        """Send OTP for email verification"""
        return await self._send_otp_core(email, "email_verification", user_name)
    
    async def send_password_reset_otp(self, email: str, user_name: str = "User") -> Dict[str, Any]:
        """Send OTP for password reset"""
        return await self._send_otp_core(email, "password_reset", user_name)
    
    async def send_email_change_otp(self, email: str, user_name: str = "User") -> Dict[str, Any]:
        """Send OTP for email change verification"""
        return await self._send_otp_core(email, "email_change", user_name)
    
    async def verify_otp(self, email: str, otp_code: str, otp_type: str) -> Dict[str, Any]:
        """Verify OTP code with attempt tracking and lockout"""
        try:
                         
            otp_key = self.get_otp_key(email, otp_type)
            logger.info(f"Verifying OTP with key: {otp_key}, email: {email}, otp_type: {otp_type}")
            
                                         
            is_locked, remaining_lockout = self.otp_store.is_locked(otp_key)
            if is_locked:
                minutes = int(remaining_lockout // 60)
                seconds = int(remaining_lockout % 60)
                logger.warning(f"OTP verification blocked - user locked out: {otp_key}")
                return {
                    "success": False, 
                    "error": f"Too many failed attempts. Please try again in {minutes} minutes and {seconds} seconds.",
                    "locked_out": True,
                    "retry_after": int(remaining_lockout)
                }
            
                                 
            otp_data = self.otp_store.get_otp(otp_key)
            
            if not otp_data:
                logger.error(f"OTP not found in store for key: {otp_key}")
                                               
                with self.otp_store._lock:
                    all_keys = list(self.otp_store._store.keys())
                    logger.error(f"Available OTP keys in store: {all_keys}")
                return {"success": False, "error": "OTP not found or expired"}
            
                                   
            provided_hash = self.hash_otp(otp_code)
            
                            
            if otp_data.hash != provided_hash:
                                           
                attempt_count = otp_data.attempts + 1
                
                                               
                if attempt_count >= 5:
                                                
                    lockout_until = time.time() + 900              
                    self.otp_store.update_attempts(otp_key, attempt_count, lockout_until)
                    
                    logger.warning(f"User {email} locked out after {attempt_count} failed OTP attempts")
                    
                    return {
                        "success": False, 
                        "error": "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
                        "locked_out": True,
                        "retry_after": 900
                    }
                
                                      
                self.otp_store.update_attempts(otp_key, attempt_count)
                
                remaining_attempts = 5 - attempt_count
                return {
                    "success": False, 
                    "error": f"Invalid OTP code. {remaining_attempts} attempt(s) remaining.",
                    "attempts_remaining": remaining_attempts
                }
            
                                                 
            self.otp_store.delete_otp(otp_key)
            logger.info(f"OTP verified and deleted from memory: {otp_key}")
            
            return {
                "success": True,
                "message": "OTP verified successfully"
            }
            
        except Exception as e:
            logger.error(f"Verify OTP error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _send_email_blocking(self, email: str, message: MIMEMultipart) -> Dict[str, Any]:
        text = message.as_string()
        success_response = {"success": True, "message": "OTP email sent successfully"}
        
        strategies = [
            ("SMTP_SSL/465", lambda: self._smtp_ssl_strategy(email, text)),
            ("STARTTLS/587", lambda: self._starttls_strategy(email, text)),
            ("Compatibility", lambda: self._compatibility_strategy(email, text))
        ]
        
        for strategy_name, strategy_func in strategies:
            try:
                logger.info(f"Attempting {strategy_name}")
                strategy_func()
                logger.info(f"{strategy_name} SUCCESS")
                return success_response
            except smtplib.SMTPAuthenticationError as e:
                logger.error(f"Auth failed: {e}")
                return {"success": False, "error": "Email service authentication failed"}
            except Exception as e:
                logger.error(f"{strategy_name} failed: {e}")
                continue
        
        return {"success": False, "error": "Unable to send verification email"}
    
    def _smtp_ssl_strategy(self, email: str, text: str):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        with smtplib.SMTP_SSL(self.smtp_server, 465, context=context, timeout=get_timeout("smtp")) as server:
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.from_email, [email], text)
    
    def _starttls_strategy(self, email: str, text: str):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        
        with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=get_timeout("smtp")) as server:
            server.starttls(context=context)
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.from_email, [email], text)
    
    def _compatibility_strategy(self, email: str, text: str):
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        context.set_ciphers('DEFAULT@SECLEVEL=1')
        context.minimum_version = ssl.TLSVersion.TLSv1
        
        with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=get_timeout("smtp")) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(self.smtp_username, self.smtp_password)
            server.sendmail(self.from_email, [email], text)

    async def send_otp_email(self, email: str, otp_code: str, user_name: str, otp_type: str) -> Dict[str, Any]:
        """Send OTP email using SMTP - properly async by running blocking I/O in thread pool"""
        try:
            # Validate email format
            if not email or '@' not in email or '.' not in email:
                logger.error(f"Invalid email format: {email}")
                return {"success": False, "error": "Invalid email address format"}
                
            # Validate OTP type and prepare email content.
            # Note: otp_type here comes from OTP_TYPES[...]["email_template"],
            # so expected values are: "verification", "password_reset", "email_change".
            if otp_type == "verification":
                subject = "Verify Your AI.ttorney Account"
                html_content = self.get_verification_email_template(otp_code, user_name)
            elif otp_type == "password_reset":
                subject = "Reset Your AI.ttorney Password"
                html_content = self.get_password_reset_email_template(otp_code, user_name)
            elif otp_type == "email_change":
                subject = "Verify Your New Email Address"
                html_content = self.get_email_change_template(otp_code, user_name)
            else:
                logger.error(f"Invalid OTP type/email template: {otp_type}")
                return {"success": False, "error": "Invalid OTP type"}
            
            # Validate SMTP credentials
            if not self.smtp_username or not self.smtp_password:
                logger.error("SMTP credentials missing. Check environment variables.")
                return {"success": False, "error": "Email service not properly configured"}
            
            # Prepare email message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = email
            
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            logger.info(f"Attempting to send OTP email to {email} using Gmail SMTP")
            logger.info(f"SMTP Configuration: {self.smtp_server}:{self.smtp_port}, Username: {self.smtp_username[:3]}...")
            
            # Run blocking SMTP operations in a thread pool to avoid blocking the event loop
            result = await asyncio.to_thread(self._send_email_blocking, email, message)
            return result
            
        except Exception as e:
            logger.error(f"Send OTP email error: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"success": False, "error": "Failed to send verification email. Please try again later."}

    
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
                <h2 style="color: #1e3a8a;">Welcome to AI.ttorney!</h2>
                <p>Hi {user_name},</p>
                <p>Thank you for registering with AI.ttorney. To complete your account verification, please use the following OTP code:</p>
                
                <div style="background-color: #f1f5f9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <h1 style="color: #1e3a8a; font-size: 32px; margin: 0; letter-spacing: 8px;">{otp_code}</h1>
                </div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't create an account with AI.ttorney, please ignore this email.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    Best regards,<br>
                    AI.ttorney
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
                <h2 style="color: #1e3a8a;">Password Reset Request</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to reset your AI.ttorney account password. Use the following OTP code to proceed:</p>
                
                <div style="background-color: #f1f5f9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <h1 style="color: #1e3a8a; font-size: 32px; margin: 0; letter-spacing: 8px;">{otp_code}</h1>
                </div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    Best regards,<br>
                    AI.ttorney
                </p>
            </div>
        </body>
        </html>
        """
    
    def get_email_change_template(self, otp_code: str, user_name: str) -> str:
        """HTML template for email change verification"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your New Email Address</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1e3a8a;">Email Address Change</h2>
                <p>Hi {user_name},</p>
                <p>We received a request to change your email address for your AI.ttorney account. To verify this new email address, please use the following OTP code:</p>
                
                <div style="background-color: #f1f5f9; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 1px solid #cbd5e1;">
                    <h1 style="color: #1e3a8a; font-size: 32px; margin: 0; letter-spacing: 8px;">{otp_code}</h1>
                </div>
                
                <p>This code will expire in <strong>2 minutes</strong>.</p>
                <p>If you didn't request this email change, please ignore this email and contact our support team immediately.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 14px; color: #6b7280;">
                    Best regards,<br>
                    AI.ttorney
                </p>
            </div>
        </body>
        </html>
        """
    
    def shutdown(self):
        """Shutdown the OTP service and cleanup resources"""
        if hasattr(self, 'otp_store'):
            self.otp_store.shutdown()
            logger.info("OTP service shutdown completed")
