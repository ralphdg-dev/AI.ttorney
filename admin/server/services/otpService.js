const crypto = require("crypto");
const fetch = require("node-fetch");

// In-memory OTP storage (consider Redis for production)
const otpStore = new Map();

// Cleanup expired OTPs every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    } else if (value.lockedUntil && now > value.lockedUntil) {
      // Clear lockout but keep OTP if not expired
      value.lockedUntil = null;
      value.attempts = 0;
    }
  }
}, 30000);

class OTPService {
  constructor() {
    // Email configuration (Resend API)
    this.resendApiKey = process.env.RESEND_API_KEY || "";
    this.fromEmail = process.env.FROM_EMAIL || "noreply@ai.ttorney.com";
    this.fromName = process.env.FROM_NAME || "AI.ttorney Admin";
    this.OTP_TTL_SECONDS = 120; // 2 minutes
    this.MAX_ATTEMPTS = 5;
    this.LOCKOUT_DURATION = 900; // 15 minutes in seconds
  }

  /**
   * Generate a random 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Hash OTP code using SHA-256
   */
  hashOTP(otpCode) {
    return crypto.createHash("sha256").update(otpCode).digest("hex");
  }

  /**
   * Get OTP storage key
   */
  getOTPKey(email, otpType = "admin_login") {
    return `otp:${otpType}:${email.toLowerCase().trim()}`;
  }

  /**
   * Send OTP via email
   */
  async sendOTPEmail(email, otpCode, adminName = "Admin") {
    try {
      if (!this.resendApiKey) {
        console.error("❌ RESEND_API_KEY not configured in environment");
        console.log("\n📧 For testing, the OTP code is:", otpCode);
        console.log("⚠️  Configure RESEND_API_KEY to send real emails\n");
        return {
          success: false,
          error:
            "Email service not configured. Check server logs for OTP code.",
        };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: [email],
          subject: "Admin Login Verification Code",
          html: this.getEmailTemplate(otpCode, adminName),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error("❌ Resend OTP email failed:", response.status, text);
        console.log("\n📧 For testing, the OTP code is:", otpCode);
        return {
          success: false,
          error:
            "Failed to send OTP email via Resend. Check server logs for OTP code.",
        };
      }

      console.log(`✅ OTP email sent successfully via Resend to ${email}`);
      return { success: true };
    } catch (error) {
      console.error("❌ Send OTP email error (Resend):", error.message);
      console.log("\n📧 For testing, the OTP code is:", otpCode);
      console.log("⚠️  Configure RESEND_API_KEY to send real emails\n");
      return {
        success: false,
        error:
          "Failed to send email via Resend. Check server logs for OTP code.",
      };
    }
  }

  /**
   * Send OTP for password reset via email
   */
  async sendPasswordResetEmail(email, otpCode, adminName = "Admin") {
    try {
      if (!this.resendApiKey) {
        console.error("❌ RESEND_API_KEY not configured in environment");
        console.log(
          "\n📧 For testing, the password reset OTP code is:",
          otpCode
        );
        console.log("⚠️  Configure RESEND_API_KEY to send real emails\n");
        return {
          success: false,
          error:
            "Email service not configured. Check server logs for OTP code.",
        };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `"${this.fromName}" <${this.fromEmail}>`,
          to: [email],
          subject: "Admin Password Reset Code",
          html: this.getPasswordResetEmailTemplate(otpCode, adminName),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        console.error(
          "❌ Resend Password Reset email failed:",
          response.status,
          text
        );
        console.log(
          "\n📧 For testing, the password reset OTP code is:",
          otpCode
        );
        return {
          success: false,
          error:
            "Failed to send password reset email via Resend. Check server logs for OTP code.",
        };
      }

      console.log(
        `✅ Password reset OTP email sent successfully via Resend to ${email}`
      );
      return { success: true };
    } catch (error) {
      console.error(
        "❌ Send Password Reset email error (Resend):",
        error.message
      );
      console.log("\n📧 For testing, the password reset OTP code is:", otpCode);
      console.log("⚠️  Configure RESEND_API_KEY to send real emails\n");
      return {
        success: false,
        error:
          "Failed to send password reset email via Resend. Check server logs for OTP code.",
      };
    }
  }

  /**
   * Generate and send OTP for admin login
   */
  async sendLoginOTP(email, adminName = "Admin") {
    try {
      const otpCode = this.generateOTP();
      const otpHash = this.hashOTP(otpCode);
      const otpKey = this.getOTPKey(email);

      // Store OTP data
      otpStore.set(otpKey, {
        hash: otpHash,
        email: email,
        expiresAt: Date.now() + this.OTP_TTL_SECONDS * 1000,
        attempts: 0,
        lockedUntil: null,
      });

      console.log(
        `Admin login OTP stored for: ${email}, expires in: ${this.OTP_TTL_SECONDS}s`
      );

      // Send email
      const emailResult = await this.sendOTPEmail(email, otpCode, adminName);

      if (emailResult.success) {
        return {
          success: true,
          message: "OTP sent successfully to your email",
          expiresInMinutes: 2,
        };
      } else {
        return {
          success: false,
          error: "Failed to send OTP email",
        };
      }
    } catch (error) {
      console.error("Send login OTP error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate and send OTP for password reset
   */
  async sendPasswordResetOTP(email, adminName = "Admin") {
    try {
      const otpCode = this.generateOTP();
      const otpHash = this.hashOTP(otpCode);
      const otpKey = this.getOTPKey(email, "password_reset");

      otpStore.set(otpKey, {
        hash: otpHash,
        email: email,
        expiresAt: Date.now() + this.OTP_TTL_SECONDS * 1000,
        attempts: 0,
        lockedUntil: null,
      });

      console.log(
        `Password reset OTP stored for: ${email}, expires in: ${this.OTP_TTL_SECONDS}s`
      );

      const emailResult = await this.sendPasswordResetEmail(
        email,
        otpCode,
        adminName
      );

      if (emailResult.success) {
        return {
          success: true,
          message: "Password reset code sent successfully to your email",
          expiresInMinutes: 2,
        };
      } else {
        return { success: false, error: "Failed to send OTP email" };
      }
    } catch (error) {
      console.error("Send password reset OTP error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(email, otpCode) {
    try {
      const otpKey = this.getOTPKey(email);
      const otpData = otpStore.get(otpKey);

      // Check if OTP exists
      if (!otpData) {
        return {
          success: false,
          error: "OTP not found or expired",
        };
      }

      // Check if expired
      if (Date.now() > otpData.expiresAt) {
        otpStore.delete(otpKey);
        return {
          success: false,
          error: "OTP has expired",
        };
      }

      // Check if locked out
      if (otpData.lockedUntil && Date.now() < otpData.lockedUntil) {
        const remainingSeconds = Math.ceil(
          (otpData.lockedUntil - Date.now()) / 1000
        );
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${minutes} minutes and ${seconds} seconds.`,
          lockedOut: true,
          retryAfter: remainingSeconds,
        };
      }

      // Verify OTP
      const providedHash = this.hashOTP(otpCode);

      if (otpData.hash !== providedHash) {
        // Increment attempt counter
        otpData.attempts += 1;

        // Check if max attempts reached
        if (otpData.attempts >= this.MAX_ATTEMPTS) {
          otpData.lockedUntil = Date.now() + this.LOCKOUT_DURATION * 1000;
          console.warn(
            `Admin ${email} locked out after ${otpData.attempts} failed OTP attempts`
          );

          return {
            success: false,
            error:
              "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
            lockedOut: true,
            retryAfter: this.LOCKOUT_DURATION,
          };
        }

        const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          error: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`,
          attemptsRemaining: remainingAttempts,
        };
      }

      // OTP is correct - delete from store
      otpStore.delete(otpKey);
      console.log(`OTP verified successfully for: ${email}`);

      return {
        success: true,
        message: "OTP verified successfully",
      };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify OTP code for a specific flow (e.g., 'password_reset')
   */
  async verifyOTPFor(email, otpCode, otpType = "admin_login") {
    try {
      const otpKey = this.getOTPKey(email, otpType);
      const otpData = otpStore.get(otpKey);

      if (!otpData) {
        return { success: false, error: "OTP not found or expired" };
      }

      if (Date.now() > otpData.expiresAt) {
        otpStore.delete(otpKey);
        return { success: false, error: "OTP has expired" };
      }

      if (otpData.lockedUntil && Date.now() < otpData.lockedUntil) {
        const remainingSeconds = Math.ceil(
          (otpData.lockedUntil - Date.now()) / 1000
        );
        return {
          success: false,
          error: `Too many failed attempts. Please try again in ${Math.floor(
            remainingSeconds / 60
          )} minutes and ${remainingSeconds % 60} seconds.`,
          lockedOut: true,
          retryAfter: remainingSeconds,
        };
      }

      const providedHash = this.hashOTP(otpCode);
      if (otpData.hash !== providedHash) {
        otpData.attempts += 1;
        if (otpData.attempts >= this.MAX_ATTEMPTS) {
          otpData.lockedUntil = Date.now() + this.LOCKOUT_DURATION * 1000;
          return {
            success: false,
            error:
              "Too many failed attempts. Your account has been temporarily locked for 15 minutes.",
            lockedOut: true,
            retryAfter: this.LOCKOUT_DURATION,
          };
        }
        const remainingAttempts = this.MAX_ATTEMPTS - otpData.attempts;
        return {
          success: false,
          error: `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`,
          attemptsRemaining: remainingAttempts,
        };
      }

      otpStore.delete(otpKey);
      console.log(`OTP (${otpType}) verified successfully for: ${email}`);
      return { success: true, message: "OTP verified successfully" };
    } catch (error) {
      console.error("Verify OTP error:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Email template for OTP
   */
  getEmailTemplate(otpCode, adminName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Admin Login Verification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #023D7B;">Admin Login Verification</h2>
          <p>Hi ${adminName},</p>
          <p>You are attempting to sign in to the AI.ttorney Admin Dashboard. Please use the following verification code to complete your login:</p>
          
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #023D7B;">
            <h1 style="color: #023D7B; font-size: 32px; margin: 0; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          
          <p>This code will expire in <strong>2 minutes</strong>.</p>
          <p><strong>Security Notice:</strong> If you didn't attempt to sign in, please ignore this email and ensure your account credentials are secure.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280;">
            Best regards,<br>
            The AI.ttorney Admin Team
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email template for password reset OTP
   */
  getPasswordResetEmailTemplate(otpCode, adminName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Admin Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #023D7B;">Admin Password Reset</h2>
          <p>Hi ${adminName},</p>
          <p>You requested to reset your AI.ttorney Admin password. Use the following verification code to continue:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; border: 2px solid #023D7B;">
            <h1 style="color: #023D7B; font-size: 32px; margin: 0; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          <p>This code will expire in <strong>2 minutes</strong>.</p>
          <p><strong>Security Notice:</strong> If you didn't request a password reset, you can safely ignore this message.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; color: #6b7280;">
            Best regards,<br>
            The AI.ttorney Admin Team
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new OTPService();
