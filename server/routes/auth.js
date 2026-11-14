import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { queryOne, run, transaction } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/rbac.js';
import config from '../config.js';

const router = express.Router();

/**
 * Enterprise Registration
 */
router.post('/register-enterprise', async (req, res) => {
  try {
    const {
      email,
      password,
      companyName,
      tradeName,
      gstin,
      pan,
      phone,
      address,
      city,
      state,
      stateCode,
      pincode,
      bankName,
      accountNumber,
      ifscCode
    } = req.body;

    if (!email || !password || !companyName || !gstin || !phone || !address || !state || !stateCode) {
      return res.status(400).json({ error: 'Validation Error', message: 'All required enterprise fields must be provided.' });
    }

    // Check existing email
    const existing = queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Conflict', message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = crypto.randomUUID();
    const enterpriseId = crypto.randomUUID();

    transaction(() => {
      // Create user
      run(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES (?, ?, ?, 'ENTERPRISE')
      `, [userId, email.toLowerCase().trim(), passwordHash]);

      // Create enterprise profile
      run(`
        INSERT INTO enterprise_profiles (
          id, user_id, company_name, trade_name, gstin, pan, phone, email,
          address, city, state, state_code, pincode, bank_name, account_number, ifsc_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        enterpriseId,
        userId,
        companyName.trim(),
        tradeName ? tradeName.trim() : companyName.trim(),
        gstin.toUpperCase().trim(),
        pan ? pan.toUpperCase().trim() : gstin.substring(2, 12),
        phone.trim(),
        email.toLowerCase().trim(),
        address.trim(),
        city ? city.trim() : 'Mumbai',
        state.trim(),
        stateCode.trim(),
        pincode ? pincode.trim() : '400001',
        bankName || 'HDFC Bank Ltd',
        accountNumber || '50200012345678',
        ifscCode || 'HDFC0000123'
      ]);

      // Create a default primary warehouse
      run(`
        INSERT INTO warehouses (
          id, enterprise_id, name, code, address, city, state, pincode, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        crypto.randomUUID(),
        enterpriseId,
        `${companyName} Central Hub`,
        'WH-MAIN-01',
        address.trim(),
        city || 'Mumbai',
        state.trim(),
        pincode || '400001'
      ]);

      // Create default reminder config
      run(`
        INSERT INTO reminder_configs (id, enterprise_id) VALUES (?, ?)
      `, [crypto.randomUUID(), enterpriseId]);

      logAudit(userId, 'REGISTER_ENTERPRISE', 'ENTERPRISE', enterpriseId, { companyName, gstin }, enterpriseId);
    });

    const token = jwt.sign({ userId, role: 'ENTERPRISE' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const enterpriseProfile = queryOne(`SELECT * FROM enterprise_profiles WHERE id = ?`, [enterpriseId]);

    return res.status(201).json({
      success: true,
      token,
      user: { id: userId, email: email.toLowerCase().trim(), role: 'ENTERPRISE' },
      profile: enterpriseProfile,
      redirectUrl: '/enterprise/dashboard'
    });
  } catch (err) {
    console.error('Enterprise registration error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

/**
 * Retailer Registration
 */
router.post('/register-retailer', async (req, res) => {
  try {
    const {
      email,
      password,
      shopName,
      ownerName,
      gstin,
      gstType = 'REGULAR',
      phone,
      address,
      city,
      state,
      stateCode,
      pincode,
      pricingPreferenceMargin = 18
    } = req.body;

    if (!email || !password || !shopName || !ownerName || !phone || !address || !state || !stateCode) {
      return res.status(400).json({ error: 'Validation Error', message: 'All required retailer fields must be provided.' });
    }

    const existing = queryOne(`SELECT id FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Conflict', message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userId = crypto.randomUUID();
    const retailerId = crypto.randomUUID();

    transaction(() => {
      run(`
        INSERT INTO users (id, email, password_hash, role)
        VALUES (?, ?, ?, 'RETAILER')
      `, [userId, email.toLowerCase().trim(), passwordHash]);

      run(`
        INSERT INTO retailer_profiles (
          id, user_id, shop_name, owner_name, gstin, gst_type, phone, email,
          address, city, state, state_code, pincode, pricing_preference_margin
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        retailerId,
        userId,
        shopName.trim(),
        ownerName.trim(),
        gstin ? gstin.toUpperCase().trim() : null,
        gstType,
        phone.trim(),
        email.toLowerCase().trim(),
        address.trim(),
        city ? city.trim() : 'Pune',
        state.trim(),
        stateCode.trim(),
        pincode ? pincode.trim() : '411001',
        Number(pricingPreferenceMargin) || 18
      ]);

      logAudit(userId, 'REGISTER_RETAILER', 'RETAILER', retailerId, { shopName, ownerName }, null, retailerId);
    });

    const token = jwt.sign({ userId, role: 'RETAILER' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    const retailerProfile = queryOne(`SELECT * FROM retailer_profiles WHERE id = ?`, [retailerId]);

    return res.status(201).json({
      success: true,
      token,
      user: { id: userId, email: email.toLowerCase().trim(), role: 'RETAILER' },
      profile: retailerProfile,
      redirectUrl: '/retailer/dashboard'
    });
  } catch (err) {
    console.error('Retailer registration error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

/**
 * Enterprise Login
 */
router.post('/login-enterprise', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
    }

    const user = queryOne(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid credentials.' });
    }

    if (user.role !== 'ENTERPRISE') {
      return res.status(403).json({
        error: 'Portal Role Mismatch',
        message: 'This account is registered as a Retailer. Please use the Retailer Login portal.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid credentials.' });
    }

    const enterprise = queryOne(`SELECT * FROM enterprise_profiles WHERE user_id = ?`, [user.id]);
    const token = jwt.sign({ userId: user.id, role: 'ENTERPRISE' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    logAudit(user.id, 'LOGIN_ENTERPRISE', 'SESSION', user.id, {}, enterprise ? enterprise.id : null);

    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: 'ENTERPRISE' },
      profile: enterprise,
      redirectUrl: '/enterprise/dashboard'
    });
  } catch (err) {
    console.error('Enterprise login error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

/**
 * Retailer Login
 */
router.post('/login-retailer', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Validation Error', message: 'Email and password are required.' });
    }

    const user = queryOne(`SELECT * FROM users WHERE email = ?`, [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid credentials.' });
    }

    if (user.role !== 'RETAILER') {
      return res.status(403).json({
        error: 'Portal Role Mismatch',
        message: 'This account is registered as an Enterprise Supplier. Please use the Enterprise Login portal.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Authentication Failed', message: 'Invalid credentials.' });
    }

    const retailer = queryOne(`SELECT * FROM retailer_profiles WHERE user_id = ?`, [user.id]);
    const token = jwt.sign({ userId: user.id, role: 'RETAILER' }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    logAudit(user.id, 'LOGIN_RETAILER', 'SESSION', user.id, {}, null, retailer ? retailer.id : null);

    return res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, role: 'RETAILER' },
      profile: retailer,
      redirectUrl: '/retailer/dashboard'
    });
  } catch (err) {
    console.error('Retailer login error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

/**
 * Current User Profile & Role Verification
 */
router.get('/me', authenticateToken, (req, res) => {
  return res.json({
    user: req.user,
    profile: req.user.role === 'ENTERPRISE' ? req.enterprise : req.retailer
  });
});

export default router;

