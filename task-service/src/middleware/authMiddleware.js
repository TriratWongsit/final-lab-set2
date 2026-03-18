const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    fetch('http://log-service:3003/api/logs/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'task-service', level: 'ERROR', event: 'JWT_INVALID',
        ip_address: req.headers['x-real-ip'] || req.ip,
        message: 'Invalid JWT: ' + err.message
      })
    }).catch(() => {});
    return res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
};
