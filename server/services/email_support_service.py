import os
import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class EmailSupportService:
    """Service for handling support email requests"""
    
    def __init__(self):
        # SMTP Configuration
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.support_email = os.getenv("SUPPORT_EMAIL", "aittorney.otp@gmail.com")
        self.from_name = os.getenv("FROM_NAME", "AI.ttorney Support System")
        
        # Validate configuration
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured. Email support will not work.")
    
    async def send_support_request(
        self,
        sender_name: str,
        sender_email: str,
        subject: str,
        message: str
    ) -> Dict[str, Any]:
        """
        Send support request email to support team
        
        Args:
            sender_name: Name of the person requesting support
            sender_email: Email address of the person requesting support
            subject: Subject of the support request
            message: Detailed message from the user
            
        Returns:
            Dictionary with success status and message/error
        """
        try:
            # Validate inputs
            if not all([sender_name, sender_email, subject, message]):
                return {
                    "success": False,
                    "error": "All fields are required"
                }
            
            # Basic email validation
            if "@" not in sender_email or "." not in sender_email:
                return {
                    "success": False,
                    "error": "Invalid email address"
                }
            
            # Log support request
            logger.info(f"Processing support request from {sender_name} ({sender_email})")
            
            # Send email to support team
            email_response = await self._send_support_email(
                sender_name,
                sender_email,
                subject,
                message
            )
            
            if email_response["success"]:
                # Send confirmation email to user
                await self._send_confirmation_email(sender_name, sender_email, subject)
                
                return {
                    "success": True,
                    "message": "Your support request has been sent successfully. Our team will get back to you soon."
                }
            else:
                return {
                    "success": False,
                    "error": email_response.get("error", "Failed to send support request")
                }
                
        except Exception as e:
            logger.error(f"Send support request error: {str(e)}")
            return {
                "success": False,
                "error": "An error occurred while sending your request. Please try again later."
            }
    
    async def _send_support_email(
        self,
        sender_name: str,
        sender_email: str,
        subject: str,
        message: str
    ) -> Dict[str, Any]:
        """Send support request email to support team"""
        try:
            email_subject = f"[Support Request] {subject}"
            html_content = self._get_support_email_template(
                sender_name,
                sender_email,
                subject,
                message
            )
            
            # Create message
            mime_message = MIMEMultipart("alternative")
            mime_message["Subject"] = email_subject
            mime_message["From"] = f"{self.from_name} <{self.support_email}>"
            mime_message["To"] = self.support_email
            mime_message["Reply-To"] = sender_email
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            mime_message.attach(html_part)
            
            # Send email with SSL context that handles certificate issues
            context = ssl.create_default_context()
            # For development/local environments, allow unverified certificates
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                text = mime_message.as_string()
                server.sendmail(self.support_email, [self.support_email], text)
            
            logger.info(f"Support request email sent successfully from {sender_email}")
            
            return {
                "success": True,
                "message": "Support email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Send support email error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _send_confirmation_email(
        self,
        sender_name: str,
        sender_email: str,
        subject: str
    ) -> Dict[str, Any]:
        """Send confirmation email to user"""
        try:
            email_subject = "We've Received Your Support Request"
            html_content = self._get_confirmation_email_template(sender_name, subject)
            
            # Create message
            mime_message = MIMEMultipart("alternative")
            mime_message["Subject"] = email_subject
            mime_message["From"] = f"{self.from_name} <{self.support_email}>"
            mime_message["To"] = sender_email
            
            # Add HTML content
            html_part = MIMEText(html_content, "html")
            mime_message.attach(html_part)
            
            # Send email with SSL context that handles certificate issues
            context = ssl.create_default_context()
            # For development/local environments, allow unverified certificates
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls(context=context)
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                text = mime_message.as_string()
                server.sendmail(self.support_email, [sender_email], text)
            
            logger.info(f"Confirmation email sent successfully to {sender_email}")
            
            return {
                "success": True,
                "message": "Confirmation email sent successfully"
            }
            
        except Exception as e:
            logger.error(f"Send confirmation email error: {str(e)}")
            # Don't fail the main request if confirmation fails
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_support_email_template(
        self,
        sender_name: str,
        sender_email: str,
        subject: str,
        message: str
    ) -> str:
        """HTML template for support request email to support team"""
        timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")
        
        sender_name_escaped = sender_name.replace("<", "&lt;").replace(">", "&gt;")
        sender_email_escaped = sender_email.replace("<", "&lt;").replace(">", "&gt;")
        subject_escaped = subject.replace("<", "&lt;").replace(">", "&gt;")
        message_escaped = message.replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Support Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
            <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #023D7B 0%, #0353A4 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Support Request</h1>
                    <p style="color: #cfe3ff; margin: 8px 0 0 0; font-size: 14px;">Received on {timestamp}</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 35px;">
                    <div style="background-color: #f0f4f8; border-left: 4px solid #023D7B; padding: 20px; margin-bottom: 25px; border-radius: 6px;">
                        <h3 style="color: #023D7B; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Contact Information</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #555; font-weight: 600; width: 100px;">Name:</td>
                                <td style="padding: 8px 0; color: #111;">{sender_name_escaped}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #555; font-weight: 600;">Email:</td>
                                <td style="padding: 8px 0;">
                                    <a href="mailto:{sender_email_escaped}" style="color: #023D7B; text-decoration: none;">{sender_email_escaped}</a>
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Subject</h3>
                        <p style="color: #333; margin: 0; padding: 15px; background-color: #f8fafc; border-radius: 6px; font-size: 15px;">
                            {subject_escaped}
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Message</h3>
                        <div style="color: #333; padding: 20px; background-color: #f8fafc; border-radius: 6px; font-size: 14px; line-height: 1.8;">
                            {message_escaped}
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="mailto:{sender_email_escaped}?subject=Re: {subject_escaped}" 
                           style="display: inline-block; background-color: #023D7B; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(2, 61, 123, 0.3);">
                            Reply to User
                        </a>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f0f4f8; padding: 20px; text-align: center; border-top: 1px solid #d1d5db;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px;">
                        This is an automated message from the <strong>AI.ttorney Support System</strong>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_confirmation_email_template(self, sender_name: str, subject: str) -> str:
        """HTML template for confirmation email to user"""
        sender_name_escaped = sender_name.replace("<", "&lt;").replace(">", "&gt;")
        subject_escaped = subject.replace("<", "&lt;").replace(">", "&gt;")
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Support Request Received</title>
        </head>
        <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; color: #333;">
            <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #023D7B 0%, #0353A4 100%); padding: 30px; text-align: center;">
                    <div style="background-color: #ffffff; width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 32px; color: #023D7B; margin-left: 17px; margin-top: 4px;">✓</span>
                    </div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Request Received!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 35px;">
                    <p style="font-size: 16px; margin: 0 0 20px 0;">
                        Hi <strong>{sender_name_escaped}</strong>,
                    </p>
                    
                    <p style="font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                        Thank you for contacting <strong>AI.ttorney Support</strong>. We've received your support request regarding:
                    </p>
                    
                    <div style="background-color: #eef4fb; border-left: 4px solid #023D7B; padding: 15px 20px; margin: 0 0 25px 0; border-radius: 6px;">
                        <p style="color: #023D7B; margin: 0; font-size: 15px; font-weight: 500;">
                            "{subject_escaped}"
                        </p>
                    </div>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
                        <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">What happens next?</h3>
                        <ul style="color: #333; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                            <li>Our support team will review your request</li>
                            <li>We'll respond within 24–48 business hours</li>
                            <li>You'll receive our response at this email address</li>
                        </ul>
                    </div>
                    
                    <p style="color: #555; font-size: 14px;">
                        If you have more details to share, simply reply to this email.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f0f4f8; padding: 25px; border-top: 1px solid #d1d5db;">
                    <p style="font-size: 14px; margin: 0 0 10px 0; text-align: center;">
                        Need immediate help? Email us at 
                        <a href="mailto:{self.support_email}" style="color: #023D7B; text-decoration: none;">{self.support_email}</a>
                    </p>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #d1d5db;">
                    <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                        Best regards,<br>
                        <strong>The AI.ttorney Support Team</strong>
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

# Global service instance
_support_service = None


def get_support_service() -> EmailSupportService:
    """Get the global email support service singleton"""
    global _support_service
    if _support_service is None:
        _support_service = EmailSupportService()
    return _support_service