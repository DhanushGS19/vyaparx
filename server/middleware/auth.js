import jwt from 'jsonwebtoken';
import { queryOne } from '../db/connection.js';
import config from '../config.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication Required',
      message: 'No authorization token provided. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = queryOne(`SELECT id, email, role, is_active FROM users WHERE id = ?`, [decoded.userId]);

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: 'Invalid User',
        message: 'Account not found or has been deactivated.'
      });
    }

    req.user = user;

    // Attach role-specific profile
    if (user.role === 'ENTERPRISE') {
      const enterprise = queryOne(`SELECT * FROM enterprise_profiles WHERE user_id = ?`, [user.id]);
      req.enterprise = enterprise;
      req.enterpriseId = enterprise ? enterprise.id : null;
    } else if (user.role === 'RETAILER') {
      const retailer = queryOne(`SELECT * FROM retailer_profiles WHERE user_id = ?`, [user.id]);
      req.retailer = retailer;
      req.retailerId = retailer ? retailer.id : null;
    }

    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid or expired session token. Please log in again.'
    });
  }
};

export default authenticateToken;

