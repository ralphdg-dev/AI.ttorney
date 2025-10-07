const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

// Verify JWT token and check admin status
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get admin details from database
    const { data: admin, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', decoded.adminId)
      .single();

    if (error || !admin) {
      return res.status(401).json({ 
        error: 'Invalid token or admin not found.' 
      });
    }

    // Check if admin role is valid (admin or superadmin)
    if (!['admin', 'superadmin'].includes(admin.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    // Add admin info to request object
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    return res.status(500).json({ error: 'Authentication error.' });
  }
};

// Check if admin has superadmin role
const requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Access denied. Superadmin role required.' 
    });
  }
  next();
};

// Optional auth - doesn't fail if no token, but adds admin info if valid token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { data: admin, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', decoded.adminId)
      .single();

    if (!error && admin && ['admin', 'superadmin'].includes(admin.role)) {
      req.admin = admin;
    }
    
    next();
  } catch (error) {
    // Ignore auth errors in optional auth
    next();
  }
};

module.exports = {
  authenticateAdmin,
  requireSuperAdmin,
  optionalAuth
};
