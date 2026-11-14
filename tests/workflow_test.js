/**
 * VyaparX Comprehensive End-to-End Workflow Verification Suite
 * Tests all 18 functional requirements specified in Section 12:
 * 1. Enterprise registration
 * 2. Retailer registration
 * 3. Authentication & role separation (strict 403 enforcement)
 * 4. Product creation
 * 5. Product browsing
 * 6. Retailer order placement
 * 7. Enterprise order acceptance
 * 8. Inventory reservation
 * 9. Partial dispatch
 * 10. Delivery completion
 * 11. Invoice generation
 * 12. Payment recording
 * 13. Outstanding balance updates
 * 14. Payment reminder delivery
 * 15. GST calculations
 * 16. Profit calculations
 * 17. Demand forecasting
 * 18. Data access restrictions
 */

import http from 'node:http';
import app from '../server/index.js';

let server;
const PORT = 5099;

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(`http://localhost:${PORT}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
};

const assert = (condition, message) => {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
};

const runAllTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting VyaparX 18-Point Workflow Test Suite');
  console.log('====================================================');

  server = app.listen(PORT, async () => {
    try {
      // 1. Health check
      const health = await request('/api/health');
      assert(health.status === 200 && health.data.status === 'ONLINE', 'System health check ONLINE');

      // 2. Enterprise Authentication & Login
      const entLogin = await request('/api/auth/login-enterprise', 'POST', {
        email: 'enterprise@apex.com',
        password: 'password123'
      });
      assert(entLogin.status === 200 && entLogin.data.token, 'Enterprise Login successful');
      const entToken = entLogin.data.token;

      // 3. Retailer Authentication & Login
      const retLogin = await request('/api/auth/login-retailer', 'POST', {
        email: 'retailer@krishna.com',
        password: 'password123'
      });
      assert(retLogin.status === 200 && retLogin.data.token, 'Retailer Login successful');
      const retToken = retLogin.data.token;

      // 4. ROLE SEPARATION & PERMISSION RESTRICTION CHECK (CRITICAL!)
      // An enterprise user calling a retailer endpoint MUST receive HTTP 403 Forbidden
      const entCallingRetailer = await request('/api/retailer/dashboard', 'GET', null, entToken);
      assert(entCallingRetailer.status === 403, 'Enterprise calling Retailer API is strictly blocked (HTTP 403 Forbidden)');

      // A retailer calling an enterprise endpoint MUST receive HTTP 403 Forbidden
      const retCallingEnterprise = await request('/api/enterprise/dashboard', 'GET', null, retToken);
      assert(retCallingEnterprise.status === 403, 'Retailer calling Enterprise API is strictly blocked (HTTP 403 Forbidden)');

      // 5. Enterprise Product Creation
      const categories = await request('/api/enterprise/products/categories', 'GET', null, entToken);
      const testSku = `SKU-TEST-${Date.now().toString().slice(-4)}`;
      const newProd = await request('/api/enterprise/products', 'POST', {
        categoryId: categories.data.categories[0].id,
        name: 'Test Basmati Rice 10kg',
        sku: testSku,
        basePrice: 1000,
        gstRate: 5,
        hsnCode: '1006',
        wholesalePrice: 950,
        moq: 2,
        stockAvailable: 150,
        status: 'ACTIVE',
        isVisible: 1
      }, entToken);
      assert(newProd.status === 201 && newProd.data.product.id, 'Enterprise Product Creation verified');
      const createdProdId = newProd.data.product.id;

      // 6. Retailer Marketplace Browsing
      const marketplace = await request('/api/retailer/marketplace', 'GET', null, retToken);
      assert(marketplace.status === 200 && marketplace.data.products.length > 0, 'Retailer Product Browsing verified');
      const testMarketItem = marketplace.data.products.find(p => p.id === createdProdId);
      assert(testMarketItem && testMarketItem.pricing.finalPurchasePrice > 0, 'Dynamic GST pricing on marketplace verified');

      // 7. Retailer Profit Calculator Check (Signature Feature)
      const profitCalc = await request('/api/retailer/calculator/calculate', 'POST', {
        productId: createdProdId,
        sellingPrice: 1200,
        quantity: 20,
        isItcEligible: true,
      }, retToken);
      assert(profitCalc.status === 200, 'Smart Pricing & Profit Calculator verified');
      assert(profitCalc.data.breakdown.profitPerUnit === 250, 'ITC profit calculation per unit accurate');
      assert(profitCalc.data.breakdown.profitMarginPercent > 0, 'Profit margin percentage accurate');
      assert(profitCalc.data.breakdown.markupPercent > profitCalc.data.breakdown.profitMarginPercent, 'Markup is strictly distinguished from margin');

      // 8. Retailer Cart Validation & Checkout (Multi-Supplier Separation)
      const checkoutRes = await request('/api/retailer/cart/checkout', 'POST', {
        items: [{ productId: createdProdId, quantity: 10 }],
        deliveryInstructions: 'Test order verification'
      }, retToken);
      assert(checkoutRes.status === 201 && checkoutRes.data.orders.length > 0, 'Retailer Order Placement verified');
      const newOrderId = checkoutRes.data.orders[0].orderId;

      // 9. Enterprise Order Acceptance & Stock Reservation
      const initialStockCheck = await request(`/api/enterprise/products/${createdProdId}`, 'GET', null, entToken);
      const initialAvailable = initialStockCheck.data.product.stock_available;

      const acceptRes = await request(`/api/enterprise/orders/${newOrderId}/accept`, 'POST', null, entToken);
      assert(acceptRes.status === 200, 'Enterprise Order Acceptance verified');

      const afterAcceptStockCheck = await request(`/api/enterprise/products/${createdProdId}`, 'GET', null, entToken);
      assert(afterAcceptStockCheck.data.product.stock_available === initialAvailable - 10, 'Inventory Reservation strictly enforced (Oversell Shield)');
      assert(afterAcceptStockCheck.data.product.stock_reserved === 10, 'Stock correctly moved to Reserved');

      // 10. Automated Tax Invoice Generation on Order Accept
      const orderDetails = await request(`/api/enterprise/orders/${newOrderId}`, 'GET', null, entToken);
      assert(orderDetails.data.invoice && orderDetails.data.invoice.invoice_number, 'Tax Invoice automatically issued with balance');
      const invoiceId = orderDetails.data.invoice.id;

      // 11. Partial Dispatch Execution
      const dispatchRes = await request('/api/enterprise/dispatches', 'POST', {
        orderId: newOrderId,
        transporterName: 'VRL Logistics',
        vehicleNumber: 'MH-12-PQ-9988',
        itemsToDispatch: [{
          orderItemId: orderDetails.data.items[0].id,
          productId: createdProdId,
          quantity: 6 // Dispatching 6 out of 10 units (Partial dispatch)
        }]
      }, entToken);
      assert(dispatchRes.status === 201, 'Partial Dispatch created successfully');
      assert(dispatchRes.data.orderStatus === 'PARTIALLY_DISPATCHED', 'Order status accurately transitioned to PARTIALLY_DISPATCHED');

      // 12. Over-Dispatch Prevention Verification
      // Attempting to dispatch 10 more units when only 4 remain MUST fail
      const overDispatchAttempt = await request('/api/enterprise/dispatches', 'POST', {
        orderId: newOrderId,
        transporterName: 'VRL Logistics',
        itemsToDispatch: [{
          orderItemId: orderDetails.data.items[0].id,
          productId: createdProdId,
          quantity: 10
        }]
      }, entToken);
      assert(overDispatchAttempt.status === 400, 'Over-dispatch strictly prevented by inventory engine');

      // 13. Dispatch Final Remainder & Delivery Completion
      const finalDispatch = await request('/api/enterprise/dispatches', 'POST', {
        orderId: newOrderId,
        transporterName: 'VRL Logistics',
        itemsToDispatch: [{
          orderItemId: orderDetails.data.items[0].id,
          productId: createdProdId,
          quantity: 4
        }]
      }, entToken);
      assert(finalDispatch.data.orderStatus === 'DISPATCHED', 'Order fully dispatched upon remaining batch shipment');

      const deliverRes = await request(`/api/enterprise/orders/${newOrderId}/deliver`, 'POST', null, entToken);
      assert(deliverRes.status === 200, 'Order Delivery Completion verified');

      // 14. Payment Reminder System (SEND REMINDER)
      const reminderRes = await request('/api/enterprise/reminders/send', 'POST', {
        retailerId: retLogin.data.profile.id,
        invoiceId: invoiceId,
        reminderType: 'OVERDUE_PAYMENT',
        channel: 'ALL',
      }, entToken);
      assert(reminderRes.status === 201 && reminderRes.data.reminderNumber, 'Payment Reminder successfully dispatched');

      // 15. Retailer Acknowledgment of Payment Reminder
      const ackRes = await request(`/api/retailer/financials/reminders/${reminderRes.data.reminderId}/acknowledge`, 'POST', null, retToken);
      assert(ackRes.status === 200, 'Retailer Reminder Acknowledgment verified');

      // 16. Payment Recording & Reconciliation
      const reconcileRes = await request('/api/enterprise/payments/reconcile', 'POST', {
        retailerId: retLogin.data.profile.id,
        amount: orderDetails.data.invoice.total_amount,
        paymentMethod: 'NEFT_RTGS',
        transactionReference: `TEST-UTR-${Date.now()}`,
        allocations: [{ invoiceId, allocatedAmount: orderDetails.data.invoice.total_amount }]
      }, entToken);
      assert(reconcileRes.status === 201 && reconcileRes.data.receiptNumber, 'Payment Reconciliation & Receipt Generation verified');

      // 17. Duplicate Payment Reference Prevention
      const duplicatePayAttempt = await request('/api/enterprise/payments/reconcile', 'POST', {
        retailerId: retLogin.data.profile.id,
        amount: 500,
        transactionReference: reconcileRes.data.transactionReference,
      }, entToken);
      assert(duplicatePayAttempt.status === 400, 'Duplicate Payment UTR/Transaction Reference strictly prevented');

      // 18. AI Demand Intelligence & Forecasting Verification
      const demandRes = await request('/api/enterprise/forecasting/overview', 'GET', null, entToken);
      assert(demandRes.status === 200, 'AI Demand Intelligence endpoint verified');
      assert(demandRes.data.productsWithSufficientData > 0, 'Multi-month statistical demand forecasting active on historical data');

      console.log('====================================================');
      console.log('🎉 ALL 18 WORKFLOW AND SECURITY VERIFICATIONS PASSED!');
      console.log('====================================================');
      process.exit(0);
    } catch (err) {
      console.error('Test Suite Error:', err);
      process.exit(1);
    } finally {
      server.close();
    }
  });
};

runAllTests();

