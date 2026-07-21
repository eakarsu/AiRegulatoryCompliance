const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../../.env' });

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if ((process.env.JWT_SECRET || '').length < 32) return res.status(503).json({ error: 'Secure JWT configuration required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded.tenantId || !decoded.role || !Array.isArray(decoded.subjectIds)) return res.status(401).json({ error: 'Signed tenant, role, and subject scope required' });

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { authMiddleware, optionalAuth };
