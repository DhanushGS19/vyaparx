import express from 'express';
import { queryAll, queryOne, run, transaction } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';
import { calculateRetailerProfitBreakdown } from '../../services/gstEngine.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Retailer Profit Dashboard summary
router.get('/', (req, res) => {
  try {
    const retailer = req.retailer;
    const isItcEligible = retailer.gst_type === 'REGULAR';

    // Get all purchased products by this retailer
    const purchasedProducts = queryAll(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.uom,
        p.image_url,
        p.wholesale_price,
        p.gst_rate,
        p.suggested_retail_price,
        e.company_name as supplier_name,
        e.state_code as supplier_state_code,
        SUM(oi.quantity) as total_purchased_qty,
        SUM(oi.total_price) as gross_investment,
        SUM(oi.gst_amount) as total_input_gst,
        sr.sold_qty,
        sr.actual_selling_price,
        sr.target_selling_price,
        sr.realized_profit
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN retailer_selling_records sr ON sr.retailer_id = ? AND sr.product_id = p.id
      WHERE o.retailer_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY gross_investment DESC
    `, [retailer.id, retailer.id]);

    let totalGrossInvestment = 0;
    let totalEstimatedSalesRevenue = 0;
    let totalEstimatedProfit = 0;
    let totalRealizedProfit = 0;
    let totalInputGst = 0;
    let totalEstimatedOutputGst = 0;
    let totalSoldUnits = 0;
    let totalPurchasedUnits = 0;

    const productBreakdowns = purchasedProducts.map(prod => {
      const purchasedQty = Number(prod.total_purchased_qty) || 0;
      const soldQty = Number(prod.sold_qty) || 0;
      totalPurchasedUnits += purchasedQty;
      totalSoldUnits += soldQty;

      const targetPrice = prod.target_selling_price 
        || prod.suggested_retail_price 
        || Math.round(prod.wholesale_price * (1 + (retailer.pricing_preference_margin || 18) / 100));

      const actualPrice = prod.actual_selling_price || targetPrice;

      const breakdown = calculateRetailerProfitBreakdown({
        baseWholesalePrice: prod.wholesale_price,
        gstRate: prod.gst_rate,
        sellingPrice: targetPrice,
        isItcEligible,
        quantity: purchasedQty,
        supplierStateCode: prod.supplier_state_code,
        retailerStateCode: retailer.state_code,
      });

      // Realized profit calculation
      const effectiveUnitCost = isItcEligible ? prod.wholesale_price : prod.wholesale_price * (1 + prod.gst_rate / 100);
      const realizedProfitFromSales = Number((soldQty * (actualPrice - effectiveUnitCost)).toFixed(2));

      totalGrossInvestment += breakdown.totalGrossInvestment;
      totalEstimatedSalesRevenue += breakdown.totalExpectedRevenue;
      totalEstimatedProfit += breakdown.totalExpectedProfit;
      totalRealizedProfit += realizedProfitFromSales;
      totalInputGst += breakdown.inputGstAmount * purchasedQty;
      totalEstimatedOutputGst += breakdown.outputGstPerUnit * purchasedQty;

      return {
        productId: prod.product_id,
        productName: prod.product_name,
        sku: prod.sku,
        uom: prod.uom,
        supplierName: prod.supplier_name,
        purchasedQty,
        soldQty,
        remainingQty: Math.max(0, purchasedQty - soldQty),
        unitBaseCost: prod.wholesale_price,
        effectiveUnitCost,
        targetSellingPrice: targetPrice,
        actualSellingPrice: actualPrice,
        profitMarginPercent: breakdown.profitMarginPercent,
        markupPercent: breakdown.markupPercent,
        estimatedTotalProfit: breakdown.totalExpectedProfit,
        realizedProfit: realizedProfitFromSales,
        inputGstPerUnit: breakdown.inputGstAmount,
      };
    });

    return res.json({
      success: true,
      summary: {
        totalGrossInvestment: Number(totalGrossInvestment.toFixed(2)),
        totalEstimatedSalesRevenue: Number(totalEstimatedSalesRevenue.toFixed(2)),
        totalEstimatedProfit: Number(totalEstimatedProfit.toFixed(2)),
        totalRealizedProfit: Number(totalRealizedProfit.toFixed(2)),
        overallEstimatedMarginPercent: totalEstimatedSalesRevenue > 0
          ? Number(((totalEstimatedProfit / totalEstimatedSalesRevenue) * 100).toFixed(1))
          : 0,
        totalPurchasedUnits,
        totalSoldUnits,
        gstSummary: {
          isItcEligible,
          totalInputGst: Number(totalInputGst.toFixed(2)),
          recoverableInputGst: isItcEligible ? Number(totalInputGst.toFixed(2)) : 0,
          nonRecoverableGst: !isItcEligible ? Number(totalInputGst.toFixed(2)) : 0,
          estimatedOutputGst: Number(totalEstimatedOutputGst.toFixed(2)),
          estimatedNetGstPayable: Number(Math.max(0, totalEstimatedOutputGst - (isItcEligible ? totalInputGst : 0)).toFixed(2)),
        }
      },
      products: productBreakdowns,
    });
  } catch (err) {
    console.error('Retailer profit dashboard error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Update actual selling prices & sold units (interactive sales logger)
router.post('/log-sales', (req, res) => {
  try {
    const retailer = req.retailer;
    const { productId, soldQty, actualSellingPrice, targetSellingPrice, notes } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Validation Error', message: 'Product ID is required.' });
    }

    const prod = queryOne(`SELECT * FROM products WHERE id = ?`, [productId]);
    if (!prod) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });

    const isItcEligible = retailer.gst_type === 'REGULAR' ? 1 : 0;
    const effectiveCost = isItcEligible ? prod.wholesale_price : prod.wholesale_price * (1 + prod.gst_rate / 100);

    const sQty = Number(soldQty) || 0;
    const aPrice = Number(actualSellingPrice) || Number(targetSellingPrice) || prod.suggested_retail_price || prod.wholesale_price * 1.2;
    const tPrice = Number(targetSellingPrice) || aPrice;
    const realized = Number((sQty * (aPrice - effectiveCost)).toFixed(2));

    // Upsert retailer selling record
    run(`
      INSERT INTO retailer_selling_records (
        id, retailer_id, product_id, purchased_qty, sold_qty, purchase_cost_per_unit,
        target_selling_price, actual_selling_price, realized_profit, is_itc_eligible, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(retailer_id, product_id) DO UPDATE SET
        sold_qty = excluded.sold_qty,
        actual_selling_price = excluded.actual_selling_price,
        target_selling_price = excluded.target_selling_price,
        realized_profit = excluded.realized_profit,
        is_itc_eligible = excluded.is_itc_eligible,
        notes = excluded.notes,
        updated_at = CURRENT_TIMESTAMP
    `, [
      crypto.randomUUID(),
      retailer.id,
      productId,
      0, // Will be aggregated
      sQty,
      effectiveCost,
      tPrice,
      aPrice,
      realized,
      isItcEligible,
      notes || null
    ]);

    return res.json({
      success: true,
      message: 'Sales record logged successfully. Realized profit updated.',
      realizedProfit: realized,
    });
  } catch (err) {
    console.error('Log sales error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

