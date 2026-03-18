const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';
function verifyToken(token) { return jwt.verify(token, SECRET); }
function requireAuth(req, res, next) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = verifyToken(token); next(); }
  catch (e) { res.status(401).json({ error: 'Invalid token' }); }
}
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin')
      return res.status(403).json({ error: 'Forbidden: admin only' });
    next();
  });
}
module.exports = { verifyToken, requireAuth, requireAdmin };
