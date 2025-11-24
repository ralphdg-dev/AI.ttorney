const express = require("express");
const jwt = require("jsonwebtoken");
const { supabase, supabaseAdmin } = require("../config/supabase");
const { authenticateAdmin } = require("../middleware/auth");
const otpService = require("../services/otpService");

const router = express.Router();

// Admin login - Step 1: Verify credentials and send OTP
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    // First, authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    // Check if user exists in admin table
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (adminError || !admin) {
      // Sign out the user since they're not an admin
      await supabase.auth.signOut();
      return res.status(403).json({
        error: "Access denied. Admin privileges required.",
      });
    }

    // Check if admin role is valid
    if (!["admin", "superadmin"].includes(admin.role)) {
      await supabase.auth.signOut();
      return res.status(403).json({
        error: "Access denied. Invalid admin role.",
      });
    }

    // Block disabled or archived admins from proceeding
    if (
      admin.status &&
      ["disabled", "archived"].includes(admin.status.toLowerCase())
    ) {
      await supabase.auth.signOut();
      return res.status(403).json({
        error: "You're account has been disabled. Contact superadmin",
      });
    }

    // Credentials are valid - send OTP for 2FA
    const otpResult = await otpService.sendLoginOTP(
      admin.email,
      admin.full_name || "Admin"
    );

    if (!otpResult.success) {
      console.error("Admin login OTP email failed:", otpResult.error);

      // In non-production environments, allow login to proceed because
      // the OTP is already stored in memory and printed to server logs
      // for testing. In production, still fail the request.
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        return res.status(500).json({
          error: "Failed to send verification code. Please try again.",
        });
      }
    }

    // Sign out temporarily - will sign back in after OTP verification
    await supabase.auth.signOut();

    // Return success with 2FA required
    res.json({
      success: true,
      requires2FA: true,
      message: "Verification code sent to your email",
      email: admin.email,
      adminId: admin.id,
      expiresInMinutes: 2,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error during login.",
    });
  }
});

// Update current admin profile (first/last name -> full_name)
router.put("/me", authenticateAdmin, async (req, res) => {
  try {
    const { firstName, lastName } = req.body || {};

    const fn = typeof firstName === "string" ? firstName.trim() : "";
    const ln = typeof lastName === "string" ? lastName.trim() : "";
    const fullName = `${fn} ${ln}`.trim();

    if (!fullName) {
      return res
        .status(400)
        .json({ error: "First name or last name is required." });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("admin")
      .update({ full_name: fullName })
      .eq("id", req.admin.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return res.status(500).json({ error: "Failed to update profile." });
    }

    const adminResponse = {
      id: updated.id,
      email: updated.email,
      full_name: updated.full_name,
      role: updated.role,
      created_at: updated.created_at,
    };

    return res.json({ success: true, admin: adminResponse });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Forgot Password - Step 1: Send password reset OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    // Find admin by email
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    // Always respond 200 to avoid user enumeration, but only send OTP if admin exists
    if (adminError || !admin) {
      return res.json({
        success: true,
        message: "If the email exists, a reset code has been sent.",
      });
    }

    const otpResult = await otpService.sendPasswordResetOTP(
      admin.email,
      admin.full_name || "Admin"
    );
    if (!otpResult.success) {
      // Still return generic success to avoid enumeration
      return res.json({
        success: true,
        message: "If the email exists, a reset code has been sent.",
      });
    }

    res.json({
      success: true,
      message: "Reset code sent to your email",
      expiresInMinutes: otpResult.expiresInMinutes || 2,
    });
  } catch (error) {
    // Do not leak internals
    res.json({
      success: true,
      message: "If the email exists, a reset code has been sent.",
    });
  }
});

// Forgot Password - Step 2: Verify OTP and issue password reset token
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    if (!email || !otpCode) {
      return res
        .status(400)
        .json({ error: "Email and OTP code are required." });
    }

    // Verify OTP for password reset
    const otpResult = await otpService.verifyOTPFor(
      email,
      otpCode,
      "password_reset"
    );
    if (!otpResult.success) {
      return res.status(400).json({
        error: otpResult.error,
        lockedOut: otpResult.lockedOut,
        retryAfter: otpResult.retryAfter,
        attemptsRemaining: otpResult.attemptsRemaining,
      });
    }

    // Get admin by email to include id in token
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (adminError || !admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Issue short-lived password reset token
    const passwordResetToken = jwt.sign(
      {
        type: "password_reset",
        adminId: admin.id,
        email: admin.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.json({ success: true, message: "OTP verified", passwordResetToken });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error during OTP verification." });
  }
});

// Forgot Password - Step 3: Reset password using password reset token
router.post("/reset-password", async (req, res) => {
  try {
    const { passwordResetToken, newPassword } = req.body;
    if (!passwordResetToken || !newPassword) {
      return res
        .status(400)
        .json({ error: "Reset token and new password are required." });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(passwordResetToken, process.env.JWT_SECRET);
      if (!decoded || decoded.type !== "password_reset") {
        return res.status(400).json({ error: "Invalid reset token." });
      }
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    // Confirm admin exists
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("id", decoded.adminId)
      .single();

    if (adminError || !admin) {
      return res.status(404).json({ error: "Admin not found." });
    }

    // Prevent password reuse - check if new password matches current password
    try {
      const { data: authCheck, error: authCheckError } =
        await supabase.auth.signInWithPassword({
          email: admin.email,
          password: newPassword,
        });

      // Sign out immediately if sign in was successful
      if (authCheck?.session) {
        await supabase.auth.signOut();
      }

      // If sign in succeeded, the new password matches the current password
      if (!authCheckError && authCheck?.user) {
        return res.status(400).json({
          error:
            "New password cannot be the same as your current password. Please choose a different password.",
        });
      }
    } catch (error) {
      // If there's an error checking the password, continue with the reset
      console.log(
        "Password reuse check failed, proceeding with reset:",
        error.message
      );
    }

    // Update password in Supabase Auth
    const { data: updatedUser, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(decoded.adminId, {
        password: newPassword,
      });

    if (updateError) {
      return res.status(500).json({ error: "Failed to update password." });
    }

    res.json({
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error during password reset." });
  }
});

// Admin login - Step 2: Verify OTP and complete login
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpCode, adminId } = req.body;

    if (!email || !otpCode || !adminId) {
      return res.status(400).json({
        error: "Email, OTP code, and admin ID are required.",
      });
    }

    // Verify OTP
    const otpResult = await otpService.verifyOTP(email, otpCode);

    if (!otpResult.success) {
      return res.status(400).json({
        error: otpResult.error,
        lockedOut: otpResult.lockedOut,
        retryAfter: otpResult.retryAfter,
        attemptsRemaining: otpResult.attemptsRemaining,
      });
    }

    // OTP verified - get admin data
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("id", adminId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: "Admin not found.",
      });
    }

    // Block disabled or archived admins at OTP verification step as well
    if (
      admin.status &&
      ["disabled", "archived"].includes(admin.status.toLowerCase())
    ) {
      return res.status(403).json({
        error: "You're account has been disabled. Contact superadmin",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    // Return admin data (excluding sensitive info)
    let userRow = null;
    try {
      const { data: u } = await supabaseAdmin
        .from("users")
        .select("photo_url, profile_photo")
        .eq("id", admin.id)
        .single();
      userRow = u || null;
    } catch (_) {}

    const adminResponse = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      created_at: admin.created_at,
      photo_url: userRow?.photo_url || null,
      profile_photo: userRow?.profile_photo || null,
    };

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: adminResponse,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error during OTP verification.",
    });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, adminId } = req.body;

    if (!email || !adminId) {
      return res.status(400).json({
        error: "Email and admin ID are required.",
      });
    }

    // Get admin data
    const { data: admin, error: adminError } = await supabaseAdmin
      .from("admin")
      .select("*")
      .eq("id", adminId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: "Admin not found.",
      });
    }

    // Send new OTP
    const otpResult = await otpService.sendLoginOTP(
      admin.email,
      admin.full_name || "Admin"
    );

    if (!otpResult.success) {
      return res.status(500).json({
        error: "Failed to send verification code. Please try again.",
      });
    }

    res.json({
      success: true,
      message: "New verification code sent to your email",
      expiresInMinutes: 2,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error during OTP resend.",
    });
  }
});

// Admin logout
router.post("/logout", authenticateAdmin, async (req, res) => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error during logout.",
    });
  }
});

// Get current admin profile
router.get("/me", authenticateAdmin, async (req, res) => {
  try {
    let userRow = null;
    try {
      const { data: u } = await supabaseAdmin
        .from("users")
        .select("photo_url, profile_photo")
        .eq("id", req.admin.id)
        .single();
      userRow = u || null;
    } catch (_) {}

    const adminResponse = {
      id: req.admin.id,
      email: req.admin.email,
      full_name: req.admin.full_name,
      role: req.admin.role,
      created_at: req.admin.created_at,
      photo_url: userRow?.photo_url || null,
      profile_photo: userRow?.profile_photo || null,
    };

    res.json({
      success: true,
      admin: adminResponse,
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error.",
    });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get("/verify", authenticateAdmin, (req, res) => {
  const fetchUser = async () => {
    try {
      const { data: u } = await supabaseAdmin
        .from("users")
        .select("photo_url, profile_photo")
        .eq("id", req.admin.id)
        .single();
      return u || null;
    } catch (_) {
      return null;
    }
  };

  fetchUser()
    .then((userRow) => {
      res.json({
        success: true,
        valid: true,
        admin: {
          id: req.admin.id,
          email: req.admin.email,
          full_name: req.admin.full_name,
          role: req.admin.role,
          photo_url: userRow?.photo_url || null,
          profile_photo: userRow?.profile_photo || null,
        },
      });
    })
    .catch(() => {
      res.json({
        success: true,
        valid: true,
        admin: {
          id: req.admin.id,
          email: req.admin.email,
          full_name: req.admin.full_name,
          role: req.admin.role,
        },
      });
    });
});

// Get joined date from users table based on current admin's email
router.get("/joined", authenticateAdmin, async (req, res) => {
  try {
    const email = req.admin.email;
    if (!email) return res.json({ success: true, created_at: null });

    const { data: userRow, error } = await supabaseAdmin
      .from("users")
      .select("created_at")
      .eq("email", email.toLowerCase())
      .single();

    if (error || !userRow) {
      return res.json({ success: true, created_at: null });
    }

    return res.json({ success: true, created_at: userRow.created_at });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Refresh token
router.post("/refresh", authenticateAdmin, async (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      {
        adminId: req.admin.id,
        email: req.admin.email,
        role: req.admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
    );

    let userRow = null;
    try {
      const { data: u } = await supabaseAdmin
        .from("users")
        .select("photo_url, profile_photo")
        .eq("id", req.admin.id)
        .single();
      userRow = u || null;
    } catch (_) {}

    res.json({
      success: true,
      token,
      admin: {
        id: req.admin.id,
        email: req.admin.email,
        full_name: req.admin.full_name,
        role: req.admin.role,
        photo_url: userRow?.photo_url || null,
        profile_photo: userRow?.profile_photo || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Internal server error during token refresh.",
    });
  }
});

// Change password (requires current password)
router.post("/change-password", authenticateAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required." });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)
    ) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number.",
      });
    }

    // Validate current password by attempting sign-in
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: req.admin.email,
        password: currentPassword,
      });

    // Immediately sign out this temporary session
    if (authData?.session) {
      await supabase.auth.signOut();
    }

    if (authError || !authData?.user) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }

    // Update password
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(req.admin.id, {
        password: newPassword,
      });

    if (updateError) {
      return res.status(500).json({ error: "Failed to update password." });
    }

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

// Update admin profile photo (top-level route)
router.put("/photo", authenticateAdmin, async (req, res) => {
  try {
    const { image } = req.body || {};
    if (!image || typeof image !== "string" || !image.startsWith("data:")) {
      return res.status(400).json({ error: "Invalid image data." });
    }

    const match = image.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid image format." });
    }
    const contentType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = contentType.split("/")[1].replace("jpeg", "jpg");

    let oldPath = null;
    try {
      const { data: current } = await supabaseAdmin
        .from("users")
        .select("photo_url, profile_photo")
        .eq("id", req.admin.id)
        .single();
      const currentUrl = current?.photo_url || current?.profile_photo || null;
      if (currentUrl && typeof currentUrl === "string") {
        const marker = "/user-profile-pics/";
        const idx = currentUrl.indexOf(marker);
        if (idx !== -1) {
          const rel = currentUrl.substring(idx + marker.length);
          if (rel && rel.startsWith("photo_url/")) {
            oldPath = rel;
          }
        }
      }
    } catch (_) {}

    if (oldPath) {
      try {
        await supabaseAdmin.storage.from("user-profile-pics").remove([oldPath]);
      } catch (_) {}
    }

    const fileName = `admin_${req.admin.id}_${Date.now()}.${ext}`;
    const storagePath = `photo_url/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("user-profile-pics")
      .upload(storagePath, buffer, { contentType });
    if (uploadError) {
      return res.status(500).json({ error: "Failed to upload photo." });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("user-profile-pics")
      .getPublicUrl(storagePath);
    const publicUrl = publicData?.publicUrl || null;

    let updatedRow = null;
    let updateError = null;
    try {
      const { data: updated, error } = await supabaseAdmin
        .from("users")
        .update({ photo_url: publicUrl, profile_photo: publicUrl })
        .eq("id", req.admin.id)
        .select("photo_url, profile_photo")
        .single();
      updatedRow = updated || null;
      updateError = error || null;
    } catch (e) {
      updateError = e;
    }

    if (!updatedRow) {
      // If no existing row, create it
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from("users")
        .upsert(
          {
            id: req.admin.id,
            email: req.admin.email,
            full_name: req.admin.full_name,
            role: req.admin.role,
            photo_url: publicUrl,
            profile_photo: publicUrl,
          },
          { onConflict: "id" }
        )
        .select("photo_url, profile_photo")
        .single();
      if (upsertError || !upserted) {
        return res.status(500).json({ error: "Failed to save photo." });
      }
      updatedRow = upserted;
    }

    return res.json({
      success: true,
      photo_url: updatedRow.photo_url,
      profile_photo: updatedRow.profile_photo,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
