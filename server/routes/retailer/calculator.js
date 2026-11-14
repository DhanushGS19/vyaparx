import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';
import {
  calculateGST,
  calculateRetailerProfitBreakdown,
  suggestSellingPrice
} from '../../services/gstEngine.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Compute full profit & GST breakdown for any product and custom selling price / quantity
router.post('/calculate', (req, res) => {
  try {
    const retailer = req.retailer;
    const {
      productId,
      customBasePrice,
      customGstRate,
      sellingPrice,
      quantity = 1,
      isItcEligible,
      targetMarginPercent,
    } = req.body;

    let basePrice = Number(customBasePrice) || 0;
    let gstRate = customGstRate !== undefined ? Number(customGstRate) : 18;
    let supplierStateCode = '27';
    let suggestedMSRP = null;
    let productName = 'Wholesale Product';
    let previousSellingPrice = null;

    if (productId) {
      const prod = queryOne(`
        SELECT p.*, e.state_code as supplier_state_code
        FROM products p
        JOIN enterprise_profiles e ON p.enterprise_id = e.id
        WHERE p.id = ?
      `, [productId]);

      if (prod) {
        productName = prod.name;
        basePrice = customBasePrice !== undefined ? Number(customBasePrice) : prod.wholesale_price;
        gstRate = customGstRate !== undefined ? Number(customGstRate) : prod.gst_rate;
        supplierStateCode = prod.supplier_state_code;
        suggestedMSRP = prod.suggested_retail_price;

        // Check if retailer had a previous selling price record
        const record = queryOne(`
          SELECT actual_selling_price, target_selling_price 
          FROM retailer_selling_records 
          WHERE retailer_id = ? AND product_id = ?
        `, [retailer.id, productId]);

        if (record) {
          previousSellingPrice = record.actual_selling_price || record.target_selling_price;
        }
      }
    }

    // Default ITC eligibility from retailer's GST type: REGULAR => eligible, COMPOSITION/UNREGISTERED => not eligible
    const itcEligible = isItcEligible !== undefined
      ? Boolean(isItcEligible)
      : (retailer.gst_type === 'REGULAR');

    // Get smart suggested selling price
    const smartSuggestion = suggestSellingPrice({
      baseWholesalePrice: basePrice,
      gstRate,
      isItcEligible: itcEligible,
      targetMarginPercent: targetMarginPercent || retailer.pricing_preference_margin || 18,
      previousSellingPrice,
    });

    const activeSellingPrice = (sellingPrice !== undefined && sellingPrice !== null && Number(sellingPrice) > 0)
      ? Number(sellingPrice)
      : (suggestedMSRP || smartSuggestion.suggestedPrice);

    // Full breakdown
    const breakdown = calculateRetailerProfitBreakdown({
      baseWholesalePrice: basePrice,
      gstRate,
      sellingPrice: activeSellingPrice,
      isItcEligible: itcEligible,
      quantity,
      supplierStateCode,
      retailerStateCode: retailer.state_code,
    });

    return res.json({
      success: true,
      productName,
      supplierStateCode,
      retailerStateCode: retailer.state_code,
      breakdown,
      smartSuggestion,
      notes: {
        marginExplanation: 'Profit Margin = (Profit / Selling Price) × 100.',
        markupExplanation: 'Markup = (Profit / Effective Cost) × 100.',
        itcExplanation: itcEligible
          ? 'Eligible for Input Tax Credit: Input GST paid is credited against output GST liability, reducing effective cost to base price.'
          : 'Non-ITC / Composition: Input GST cannot be claimed as tax credit and is recorded as part of gross business cost.'
      }
    });
  } catch (err) {
    console.error('Profit calculator error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Compare product profitabilities
router.post('/compare-profitability', (req, res) => {
  try {
    const retailer = req.retailer;
    const { products } = req.body; // array of { productId, sellingPrice, quantity }

    if (!products || !products.length) {
      return res.status(400).json({ error: 'Validation Error', message: 'Products array is required.' });
    }

    const results = [];
    for (const item of products) {
      const prod = queryOne(`
        SELECT p.*, e.state_code as supplier_state_code, e.company_name as supplier_name
        FROM products p
        JOIN enterprise_profiles e ON p.enterprise_id = e.id
        WHERE p.id = ?
      `, [item.productId]);

      if (!prod) continue;

      const isItcEligible = retailer.gst_type === 'REGULAR';
      const sPrice = item.sellingPrice ? Number(item.sellingPrice) : (prod.suggested_retail_price || Math.round(prod.wholesale_price * 1.25));

      const breakdown = calculateRetailerProfitBreakdown({
        baseWholesalePrice: prod.wholesale_price,
        gstRate: prod.gst_rate,
        sellingPrice: sPrice,
        isItcEligible,
        quantity: item.quantity || 1,
        supplierStateCode: prod.supplier_state_code,
        retailerStateCode: retailer.state_code,
      });

      results.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        supplierName: prod.supplier_name,
        breakdown,
      });
    }

    // Sort by profit margin descending
    results.sort((a, b) => b.breakdown.profitMarginPercent - a.breakdown.profitMarginPercent);

    return res.json({ success: true, count: results.length, comparison: results });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

