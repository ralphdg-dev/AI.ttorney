// admin/server/middleware/auth.js
const { supabase } = require('../routes/config/supabaseClient');

// Verifies Bearer token using Supabase and attaches req.user
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid token' });

    req.user = data.user;
    const appRole = req.user?.app_metadata?.role || req.user?.app_metadata?.roles?.[0];
    req.userRole = (appRole || req.user?.user_metadata?.role || '').toString().toLowerCase();
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(allowedRoles = []) {
  return function roleGuard(req, res, next) {
    const role = (req.userRole || '').toString().toLowerCase();
    if (!allowedRoles.map((r) => r.toLowerCase()).includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin access required.' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
