import express from 'express';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Get profile & connected suppliers
router.get('/', (req, res) => {
  try {
    const retailer = queryOne(`SELECT * FROM retailer_profiles WHERE id = ?`, [req.retailerId]);

    const connectedSuppliers = queryAll(`
      SELECT 
        e.id, e.company_name, e.city, e.state, e.phone, e.email,
        COALESCE(rel.status, 'ACTIVE') as status,
        COALESCE(rel.credit_limit, 50000) as credit_limit,
        COALESCE(rel.payment_terms_days, 15) as payment_terms_days
      FROM enterprise_profiles e
      LEFT JOIN supplier_retailer_relationships rel ON e.id = rel.enterprise_id AND rel.retailer_id = ?
      ORDER BY e.company_name ASC
    `, [req.retailerId]);

    return res.json({
      success: true,
      profile: retailer,
      connectedSuppliers,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Update profile preferences
router.put('/', (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      phone,
      address,
      city,
      state,
      stateCode,
      pincode,
      gstin,
      gstType,
      pricingPreferenceMargin
    } = req.body;

    run(`
      UPDATE retailer_profiles
      SET shop_name = COALESCE(?, shop_name),
          owner_name = COALESCE(?, owner_name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          state_code = COALESCE(?, state_code),
          pincode = COALESCE(?, pincode),
          gstin = COALESCE(?, gstin),
          gst_type = COALESCE(?, gst_type),
          pricing_preference_margin = COALESCE(?, pricing_preference_margin)
      WHERE id = ?
    `, [
      shopName || null,
      ownerName || null,
      phone || null,
      address || null,
      city || null,
      state || null,
      stateCode || null,
      pincode || null,
      gstin || null,
      gstType || null,
      pricingPreferenceMargin !== undefined ? Number(pricingPreferenceMargin) : null,
      req.retailerId
    ]);

    const updated = queryOne(`SELECT * FROM retailer_profiles WHERE id = ?`, [req.retailerId]);
    return res.json({ success: true, profile: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

