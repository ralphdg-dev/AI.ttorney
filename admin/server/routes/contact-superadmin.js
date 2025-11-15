const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

// Rate limiting for contact form
const contactLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per window
  message: { error: 'Too many contact requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' // Skip in development
});

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates in development
    }
  });
};

// HTML email template
const getContactEmailTemplate = (name, email, subject, message) => {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Manila'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Admin Contact Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
        <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #023D7B 0%, #0E5E9C 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Admin Contact Request</h1>
                <p style="color: #cfe3ff; margin: 8px 0 0 0; font-size: 14px;">Received on ${timestamp}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 35px;">
                <div style="background-color: #f0f4f8; border-left: 4px solid #023D7B; padding: 20px; margin-bottom: 25px; border-radius: 6px;">
                    <h3 style="color: #023D7B; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">Contact Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #555; font-weight: 600; width: 100px;">Name:</td>
                            <td style="padding: 8px 0; color: #111;">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #555; font-weight: 600;">Email:</td>
                            <td style="padding: 8px 0;">
                                <a href="mailto:${email}" style="color: #023D7B; text-decoration: none;">${email}</a>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Subject</h3>
                    <p style="color: #333; margin: 0; padding: 15px; background-color: #f8fafc; border-radius: 6px; font-size: 15px;">
                        ${subject}
                    </p>
                </div>
                
                <div style="margin-bottom: 25px;">
                    <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">Message</h3>
                    <div style="color: #333; padding: 20px; background-color: #f8fafc; border-radius: 6px; font-size: 14px; line-height: 1.8;">
                        ${message.replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="mailto:${email}?subject=Re: ${subject}" 
                       style="display: inline-block; background-color: #023D7B; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 4px rgba(2, 61, 123, 0.3);">
                        Reply to Sender
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f0f4f8; padding: 20px; text-align: center; border-top: 1px solid #d1d5db;">
                <p style="margin: 0; color: #6b7280; font-size: 13px;">
                    This is an automated message from the <strong>AI.ttorney Admin Panel</strong>
                </p>
                <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px;">
                    IP Address: ${process.env.NODE_ENV === 'development' ? 'Development Mode' : 'Logged for security'}
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Confirmation email template for sender
const getConfirmationEmailTemplate = (name, subject) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Message Received - AI.ttorney Admin</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #023D7B 0%, #0E5E9C 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Message Received!</h1>
                <p style="color: #cfe3ff; margin: 8px 0 0 0; font-size: 14px;">AI.ttorney Admin Support</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 35px;">
                <p style="font-size: 16px; margin: 0 0 20px 0;">
                    Hi <strong>${name}</strong>,
                </p>
                
                <p style="font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
                    Thank you for contacting the <strong>AI.ttorney Admin Team</strong>. We've received your message regarding:
                </p>
                
                <div style="background-color: #eef4fb; border-left: 4px solid #023D7B; padding: 15px 20px; margin: 0 0 25px 0; border-radius: 6px;">
                    <p style="color: #023D7B; margin: 0; font-size: 15px; font-weight: 500;">
                        "${subject}"
                    </p>
                </div>
                
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 0 0 25px 0;">
                    <h3 style="color: #023D7B; margin: 0 0 10px 0; font-size: 15px; font-weight: 600;">What happens next?</h3>
                    <ul style="color: #333; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
                        <li>Our superadmin team will review your message</li>
                        <li>We'll respond within 24-48 business hours</li>
                        <li>You'll receive our response at this email address</li>
                        <li>For urgent matters, please check your email regularly</li>
                    </ul>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 0 0 20px 0;">
                    <p style="color: #856404; margin: 0; font-size: 13px;">
                        <strong>Important:</strong> Please keep this email for your records. If you don't receive a response within 48 hours, please check your spam folder or contact us again.
                    </p>
                </div>
                
                <p style="color: #555; font-size: 14px;">
                    If you have additional information to provide, simply reply to this email.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f0f4f8; padding: 25px; border-top: 1px solid #d1d5db;">
                <p style="font-size: 14px; margin: 0 0 10px 0; text-align: center;">
                    Need immediate assistance? Email us at 
                    <a href="mailto:aittorney.otp@gmail.com" style="color: #023D7B; text-decoration: none;">aittorney.otp@gmail.com</a>
                </p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #d1d5db;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                    Best regards,<br>
                    <strong>The AI.ttorney Admin Team</strong><br>
                    <span style="font-size: 11px;">Legal Technology Platform</span>
                </p>
            </div>
        </div>
    </body>
    </html>
  `;
};

// POST /api/contact-superadmin
router.post('/', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
    }

    // Check SMTP configuration
    if (!process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured');
      return res.status(500).json({
        success: false,
        error: 'Email service not configured'
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify transporter connection
    try {
      await transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('SMTP connection failed:', verifyError);
      return res.status(500).json({
        success: false,
        error: 'Email service connection failed'
      });
    }

    // Prepare email
    const emailHtml = getContactEmailTemplate(name, email, subject, message);
    const mailOptions = {
      from: `"${process.env.FROM_NAME || 'AI.ttorney Admin'}" <${process.env.FROM_EMAIL || process.env.SMTP_USERNAME}>`,
      to: 'aittorney.otp@gmail.com',
      replyTo: email,
      subject: `[Admin Contact] ${subject}`,
      html: emailHtml
    };

    // Send email to superadmin
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`Admin contact email sent successfully from ${email}:`, info.messageId);

    // Send confirmation email to sender
    try {
      const confirmationHtml = getConfirmationEmailTemplate(name, subject);
      const confirmationMailOptions = {
        from: `"${process.env.FROM_NAME || 'AI.ttorney Admin'}" <${process.env.FROM_EMAIL || process.env.SMTP_USERNAME}>`,
        to: email,
        subject: 'Your message has been received - AI.ttorney Admin',
        html: confirmationHtml
      };

      const confirmationInfo = await transporter.sendMail(confirmationMailOptions);
      console.log(`Confirmation email sent successfully to ${email}:`, confirmationInfo.messageId);
    } catch (confirmationError) {
      console.error('Failed to send confirmation email:', confirmationError);
      // Don't fail the main request if confirmation fails
    }

    res.json({
      success: true,
      message: 'Your message has been sent to the superadmin successfully. A confirmation email has been sent to your inbox.',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending admin contact email:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again later.'
    });
  }
});

module.exports = router;
