import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';
import { analyzeProductDemand, getEnterpriseDemandIntelligence } from '../../services/demandForecast.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// Overview of enterprise demand intelligence
router.get('/overview', (req, res) => {
  try {
    const data = getEnterpriseDemandIntelligence(req.enterpriseId);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('Demand forecast error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Single product forecast & historical regression analysis
router.get('/product/:id', (req, res) => {
  try {
    const data = analyzeProductDemand(req.enterpriseId, req.params.id);
    return res.json({ success: true, forecast: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

