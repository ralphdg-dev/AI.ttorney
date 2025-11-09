const express = require('express');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { authenticateAdmin } = require('../middleware/auth');
const otpService = require('../services/otpService');

const router = express.Router();

// Admin login - Step 1: Verify credentials and send OTP
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required.' 
      });
    }

    // First, authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({ 
        error: 'Invalid email or password.' 
      });
    }

    // Check if user exists in admin table
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (adminError || !admin) {
      // Sign out the user since they're not an admin
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }

    // Check if admin role is valid
    if (!['admin', 'superadmin'].includes(admin.role)) {
      await supabase.auth.signOut();
      return res.status(403).json({ 
        error: 'Access denied. Invalid admin role.' 
      });
    }

    // Credentials are valid - send OTP for 2FA
    const otpResult = await otpService.sendLoginOTP(admin.email, admin.full_name || 'Admin');

    if (!otpResult.success) {
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.'
      });
    }

    // Sign out temporarily - will sign back in after OTP verification
    await supabase.auth.signOut();

    // Return success with 2FA required
    res.json({
      success: true,
      requires2FA: true,
      message: 'Verification code sent to your email',
      email: admin.email,
      adminId: admin.id,
      expiresInMinutes: 2
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error during login.' 
    });
  }
});

// Admin login - Step 2: Verify OTP and complete login
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otpCode, adminId } = req.body;

    if (!email || !otpCode || !adminId) {
      return res.status(400).json({
        error: 'Email, OTP code, and admin ID are required.'
      });
    }

    // Verify OTP
    const otpResult = await otpService.verifyOTP(email, otpCode);

    if (!otpResult.success) {
      return res.status(400).json({
        error: otpResult.error,
        lockedOut: otpResult.lockedOut,
        retryAfter: otpResult.retryAfter,
        attemptsRemaining: otpResult.attemptsRemaining
      });
    }

    // OTP verified - get admin data
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: 'Admin not found.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Return admin data (excluding sensitive info)
    const adminResponse = {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      created_at: admin.created_at
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: adminResponse
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Internal server error during OTP verification.'
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, adminId } = req.body;

    if (!email || !adminId) {
      return res.status(400).json({
        error: 'Email and admin ID are required.'
      });
    }

    // Get admin data
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      return res.status(403).json({
        error: 'Admin not found.'
      });
    }

    // Send new OTP
    const otpResult = await otpService.sendLoginOTP(admin.email, admin.full_name || 'Admin');

    if (!otpResult.success) {
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'New verification code sent to your email',
      expiresInMinutes: 2
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      error: 'Internal server error during OTP resend.'
    });
  }
});

// Admin logout
router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Internal server error during logout.' 
    });
  }
});

// Get current admin profile
router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    const adminResponse = {
      id: req.admin.id,
      email: req.admin.email,
      full_name: req.admin.full_name,
      role: req.admin.role,
      created_at: req.admin.created_at
    };

    res.json({
      success: true,
      admin: adminResponse
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Internal server error.' 
    });
  }
});

// Verify token (for frontend to check if token is still valid)
router.get('/verify', authenticateAdmin, (req, res) => {
  res.json({
    success: true,
    valid: true,
    admin: {
      id: req.admin.id,
      email: req.admin.email,
      full_name: req.admin.full_name,
      role: req.admin.role
    }
  });
});

// Refresh token
router.post('/refresh', authenticateAdmin, async (req, res) => {
  try {
    // Generate new JWT token
    const token = jwt.sign(
      { 
        adminId: req.admin.id,
        email: req.admin.email,
        role: req.admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: req.admin.id,
        email: req.admin.email,
        full_name: req.admin.full_name,
        role: req.admin.role
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error during token refresh.' 
    });
  }
});

module.exports = router;
