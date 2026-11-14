import { run } from '../db/connection.js';
import crypto from 'node:crypto';

export const logAudit = (userId, action, entityType, entityId, details, enterpriseId = null, retailerId = null) => {
  try {
    run(`
      INSERT INTO audit_logs (id, enterprise_id, retailer_id, user_id, action, entity_type, entity_id, details_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      crypto.randomUUID(),
      enterpriseId,
      retailerId,
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null
    ]);
  } catch (err) {
    console.error('Audit log failure:', err.message);
  }
};

/**
 * Strict RBAC Gate for Enterprise Portal
 * Prevents retailers or unauthorized users from accessing enterprise data
 */
export const requireEnterprise = (req, res, next) => {
  if (!req.user || req.user.role !== 'ENTERPRISE') {
    if (req.user) {
      logAudit(req.user.id, 'UNAUTHORIZED_PORTAL_ACCESS_ATTEMPT', 'PORTAL', 'ENTERPRISE', {
        attemptedEndpoint: req.originalUrl,
        userRole: req.user.role
      });
    }
    return res.status(403).json({
      error: 'Access Denied',
      code: 'ERR_PORTAL_RESTRICTION',
      message: 'Critical Security Restriction: Enterprise portal endpoints are strictly reserved for verified Enterprise/Supplier accounts. Access denied.'
    });
  }

  if (!req.enterpriseId) {
    return res.status(400).json({
      error: 'Incomplete Enterprise Profile',
      message: 'Enterprise profile is not configured. Please complete company onboarding.'
    });
  }

  next();
};

/**
 * Strict RBAC Gate for Retailer Portal
 * Prevents enterprises or unauthorized users from accessing retailer data
 */
export const requireRetailer = (req, res, next) => {
  if (!req.user || req.user.role !== 'RETAILER') {
    if (req.user) {
      logAudit(req.user.id, 'UNAUTHORIZED_PORTAL_ACCESS_ATTEMPT', 'PORTAL', 'RETAILER', {
        attemptedEndpoint: req.originalUrl,
        userRole: req.user.role
      });
    }
    return res.status(403).json({
      error: 'Access Denied',
      code: 'ERR_PORTAL_RESTRICTION',
      message: 'Critical Security Restriction: Retailer portal endpoints are strictly reserved for verified Retailer/Shopkeeper accounts. Access denied.'
    });
  }

  if (!req.retailerId) {
    return res.status(400).json({
      error: 'Incomplete Retailer Profile',
      message: 'Retailer profile is not configured. Please complete shop onboarding.'
    });
  }

  next();
};

export default {
  requireEnterprise,
  requireRetailer,
  logAudit,
};

