import express from 'express';
import { queryAll } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';
import { calculateGST } from '../../services/gstEngine.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Helper to parse individual piece counts inside wholesale packaging (e.g. Card of 12, Case of 24)
export function parseInnerUnits(uom, name) {
  const str = uom || name || '';
  const multiMatch = str.match(/(\d+)\s*packs?\s*of\s*(\d+)(?:\b|(?=[^\w]))(?![a-zA-Z])/i);
  if (multiMatch) {
    const total = parseInt(multiMatch[1]) * parseInt(multiMatch[2]);
    if (total > 0 && total < 1000) return { count: total, label: 'Piece' };
  }
  const singleMatch = str.match(/(?:^|[(\s])(\d+)\s*(?:glass\s*)?(bars?|brushes?|bottles?|tubes?|pouches?|jars?|packs?|bags?|cans?|pieces?|pcs?|units?|tins?)/i);
  if (singleMatch) {
    const count = parseInt(singleMatch[1]);
    let label = singleMatch[2].replace(/s$/i, '');
    if (count > 0 && count < 1000) return { count, label: label.charAt(0).toUpperCase() + label.slice(1) };
  }
  return { count: 1, label: 'Piece' };
}

// Browse marketplace products
router.get('/', (req, res) => {
  try {
    const retailer = req.retailer;
    const {
      categoryId,
      enterpriseId,
      search,
      inStockOnly,
      minPrice,
      maxPrice,
      sortBy = 'POPULAR' // 'PRICE_ASC', 'PRICE_DESC', 'POPULAR', 'NEWEST'
    } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name as category_name, c.slug as category_slug,
        e.company_name as supplier_name, e.city as supplier_city, e.state as supplier_state,
        e.state_code as supplier_state_code
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      WHERE p.status = 'ACTIVE' AND p.is_visible = 1
    `;
    const params = [];

    if (categoryId) {
      query += ` AND p.category_id = ?`;
      params.push(categoryId);
    }
    if (enterpriseId) {
      query += ` AND p.enterprise_id = ?`;
      params.push(enterpriseId);
    }
    if (inStockOnly === 'true' || inStockOnly === '1') {
      query += ` AND p.stock_available > 0`;
    }
    if (minPrice) {
      query += ` AND p.wholesale_price >= ?`;
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += ` AND p.wholesale_price <= ?`;
      params.push(Number(maxPrice));
    }
    if (search && search.trim()) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ? OR e.company_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (sortBy === 'PRICE_ASC') {
      query += ` ORDER BY p.wholesale_price ASC`;
    } else if (sortBy === 'PRICE_DESC') {
      query += ` ORDER BY p.wholesale_price DESC`;
    } else if (sortBy === 'NEWEST') {
      query += ` ORDER BY p.created_at DESC`;
    } else {
      query += ` ORDER BY p.stock_dispatched DESC, p.wholesale_price ASC`;
    }

    const rawProducts = queryAll(query, params);

    // Enrich each product with dynamic GST calculations and retail resale economics tailored to this retailer
    const isItcEligible = retailer.gst_type === 'REGULAR';

    const products = rawProducts.map(prod => {
      const wholesaleBase = prod.wholesale_price || prod.base_price;
      const gstCalc = calculateGST({
        basePrice: wholesaleBase,
        gstRate: prod.gst_rate,
        supplierStateCode: prod.supplier_state_code,
        retailerStateCode: retailer.state_code,
        quantity: 1,
      });

      let bulkTiers = [];
      if (prod.bulk_pricing_json) {
        try {
          bulkTiers = JSON.parse(prod.bulk_pricing_json);
        } catch (e) {
          bulkTiers = [];
        }
      }

      // Retail economics: What should the shopkeeper sell it for, and what profit will they pocket?
      const effectiveCostPerUnit = isItcEligible ? wholesaleBase : gstCalc.totalAmount;
      const suggestedRetailPrice = prod.suggested_retail_price || Math.round(effectiveCostPerUnit * 1.25);
      const unitProfit = Math.max(0, Math.round((suggestedRetailPrice - effectiveCostPerUnit) * 100) / 100);
      const profitMarginPercent = suggestedRetailPrice > 0 
        ? Math.round(((unitProfit / suggestedRetailPrice) * 100) * 10) / 10 
        : 0;
      const markupPercent = effectiveCostPerUnit > 0 
        ? Math.round(((unitProfit / effectiveCostPerUnit) * 100) * 10) / 10 
        : 0;

      // Single piece breakdown for walk-in shop customers
      const innerUnits = parseInnerUnits(prod.uom, prod.name);
      const unitsPerWholesalePack = innerUnits.count;
      const innerUnitLabel = innerUnits.label;

      const singleProductSuggestedPrice = Number((suggestedRetailPrice / unitsPerWholesalePack).toFixed(2));
      const singleProductWholesaleCost = Number((effectiveCostPerUnit / unitsPerWholesalePack).toFixed(2));
      const singleProductProfit = Math.max(0, Number((singleProductSuggestedPrice - singleProductWholesaleCost).toFixed(2)));
      const singleProductMarginPct = singleProductSuggestedPrice > 0
        ? Math.round(((singleProductProfit / singleProductSuggestedPrice) * 100) * 10) / 10
        : 0;

      // Minimum wholesale order quantity batch totals (e.g. MOQ = 5 units)
      const moqQty = prod.moq || 1;
      const moqTotalSinglePieces = moqQty * unitsPerWholesalePack;
      const moqCost = Math.round((gstCalc.totalAmount * moqQty) * 100) / 100;
      const moqRevenue = Math.round((suggestedRetailPrice * moqQty) * 100) / 100;
      const moqProfit = Math.round((unitProfit * moqQty) * 100) / 100;

      return {
        ...prod,
        bulkPricingTiers: bulkTiers,
        pricing: {
          wholesaleBasePrice: wholesaleBase,
          gstRate: prod.gst_rate,
          gstAmount: gstCalc.totalGst,
          finalPurchasePrice: gstCalc.totalAmount,
          isIntraState: gstCalc.isIntraState,
          cgstAmount: gstCalc.cgstAmount,
          sgstAmount: gstCalc.sgstAmount,
          igstAmount: gstCalc.igstAmount,
        },
        retailEconomics: {
          isItcEligible,
          // Single piece economics
          unitsPerWholesalePack,
          innerUnitLabel,
          singleProductSuggestedPrice,
          singleProductWholesaleCost,
          singleProductProfit,
          singleProductMarginPct,
          // Wholesale pack economics
          effectiveCostPerUnit,
          suggestedRetailPrice,
          unitProfit,
          profitMarginPercent,
          markupPercent,
          // MOQ batch economics
          moqQty,
          moqTotalSinglePieces,
          moqCost,
          moqRevenue,
          moqProfit,
        }
      };
    });

    // Extract unique suppliers for filter
    const suppliers = queryAll(`
      SELECT DISTINCT e.id, e.company_name, e.city, e.state
      FROM enterprise_profiles e
      JOIN products p ON e.id = p.enterprise_id
      WHERE p.status = 'ACTIVE' AND p.is_visible = 1
      ORDER BY e.company_name ASC
    `);

    // Extract available product categories
    const categories = queryAll(`
      SELECT DISTINCT c.id, c.name, c.slug, c.description, c.icon
      FROM product_categories c
      ORDER BY c.name ASC
    `);

    return res.json({
      success: true,
      count: products.length,
      products,
      suppliers,
      categories,
    });
  } catch (err) {
    console.error('Marketplace error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Retailer category listing endpoint
router.get('/categories', (req, res) => {
  try {
    const categories = queryAll(`SELECT * FROM product_categories ORDER BY name ASC`);
    return res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Compare products across suppliers
router.get('/compare', (req, res) => {
  try {
    const retailer = req.retailer;
    const { productIds } = req.query; // comma-separated product IDs

    if (!productIds) {
      return res.status(400).json({ error: 'Validation Error', message: 'productIds query parameter is required.' });
    }

    const ids = productIds.split(',').map(s => s.trim()).filter(Boolean);
    if (!ids.length) return res.json({ success: true, comparison: [] });

    const placeholders = ids.map(() => '?').join(',');
    const products = queryAll(`
      SELECT 
        p.*,
        c.name as category_name,
        e.company_name as supplier_name, e.city as supplier_city, e.state_code as supplier_state_code
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      WHERE p.id IN (${placeholders})
    `, ids);

    const enriched = products.map(prod => {
      const gstCalc = calculateGST({
        basePrice: prod.wholesale_price,
        gstRate: prod.gst_rate,
        supplierStateCode: prod.supplier_state_code,
        retailerStateCode: retailer.state_code,
        quantity: 1,
      });

      return {
        ...prod,
        gstDetails: gstCalc,
        finalUnitPrice: gstCalc.totalAmount,
      };
    });

    return res.json({ success: true, comparison: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

