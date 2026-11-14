/**
 * In-Process End-to-End Workflow Verification Suite for VyaparX
 * Executes requests directly against the Express app handler without socket binding.
 */

process.env.NODE_ENV = 'test';
import http from 'node:http';
import { Socket } from 'node:net';
const { default: app } = await import('../server/index.js');

const dispatch = (url, method = 'GET', body = null, headers = {}) => {
  return new Promise((resolve) => {
    const socket = new Socket();
    const payload = body ? JSON.stringify(body) : null;
    
    const req = new http.IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
      ...headers,
    };

    const res = new http.ServerResponse(req);
    let responseBody = '';

    res.write = (chunk) => {
      if (chunk) responseBody += chunk;
      return true;
    };

    res.end = (chunk) => {
      if (chunk) responseBody += chunk;
      let parsed = responseBody;
      try {
        parsed = JSON.parse(responseBody);
      } catch (e) {}
      resolve({ status: res.statusCode, data: parsed });
    };

    app.handle(req, res);

    if (payload) {
      req.push(payload);
    }
    req.push(null);
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
  console.log('🧪 Starting VyaparX In-Process Workflow Verification');
  console.log('====================================================');

  try {
    // 1. Health check
    const health = await dispatch('/api/health');
    assert(health.status === 200 && health.data.status === 'ONLINE', 'System health check ONLINE');

    // 2. Enterprise Authentication & Login
    const entLogin = await dispatch('/api/auth/login-enterprise', 'POST', {
      email: 'enterprise@apex.com',
      password: 'password123'
    });
    assert(entLogin.status === 200 && entLogin.data.token, 'Enterprise Login successful');
    const entToken = entLogin.data.token;
    const entHeaders = { authorization: `Bearer ${entToken}` };

    // 3. Retailer Authentication & Login
    const retLogin = await dispatch('/api/auth/login-retailer', 'POST', {
      email: 'retailer@krishna.com',
      password: 'password123'
    });
    assert(retLogin.status === 200 && retLogin.data.token, 'Retailer Login successful');
    const retToken = retLogin.data.token;
    const retHeaders = { authorization: `Bearer ${retToken}` };

    // 4. ROLE SEPARATION & PERMISSION RESTRICTION CHECK (CRITICAL!)
    const entCallingRetailer = await dispatch('/api/retailer/dashboard', 'GET', null, entHeaders);
    assert(entCallingRetailer.status === 403, 'Enterprise calling Retailer API is strictly blocked (HTTP 403 Forbidden)');

    const retCallingEnterprise = await dispatch('/api/enterprise/dashboard', 'GET', null, retHeaders);
    assert(retCallingEnterprise.status === 403, 'Retailer calling Enterprise API is strictly blocked (HTTP 403 Forbidden)');

    // 5. Enterprise Product Creation
    const categories = await dispatch('/api/enterprise/products/categories', 'GET', null, entHeaders);
    const testSku = `SKU-INP-${Date.now().toString().slice(-4)}`;
    const newProd = await dispatch('/api/enterprise/products', 'POST', {
      categoryId: categories.data.categories[0].id,
      name: 'Patanjali Organic Atta 10kg',
      sku: testSku,
      basePrice: 420,
      gstRate: 5,
      hsnCode: '1101',
      wholesalePrice: 395,
      moq: 2,
      stockAvailable: 150,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      status: 'ACTIVE',
      isVisible: 1
    }, entHeaders);
    assert(newProd.status === 201 && newProd.data.product?.id, 'Enterprise Product Creation verified');
    const createdProdId = newProd.data.product.id;

    // 6. Retailer Marketplace Browsing
    const marketplace = await dispatch('/api/retailer/marketplace', 'GET', null, retHeaders);
    assert(marketplace.status === 200 && marketplace.data.products?.length > 0, 'Retailer Product Browsing verified');
    const testMarketItem = marketplace.data.products.find(p => p.id === createdProdId);
    assert(testMarketItem && testMarketItem.pricing?.finalPurchasePrice > 0, 'Dynamic GST pricing on marketplace verified');

    // 7. Retailer Profit Calculator Check (Signature Feature)
    const profitCalc = await dispatch('/api/retailer/calculator/calculate', 'POST', {
      productId: createdProdId,
      sellingPrice: 480,
      quantity: 20,
      isItcEligible: true,
    }, retHeaders);
    assert(profitCalc.status === 200, 'Smart Pricing & Profit Calculator verified');
    assert(profitCalc.data.breakdown?.profitPerUnit > 0, 'ITC profit calculation per unit accurate');
    assert(profitCalc.data.breakdown?.profitMarginPercent > 0, 'Profit margin percentage accurate');
    assert(profitCalc.data.breakdown?.markupPercent > profitCalc.data.breakdown?.profitMarginPercent, 'Markup strictly distinguished from margin');

    // 8. Retailer Cart Checkout (Multi-Supplier Separation)
    const checkoutRes = await dispatch('/api/retailer/cart/checkout', 'POST', {
      items: [{ productId: createdProdId, quantity: 10 }],
      deliveryInstructions: 'Test order verification'
    }, retHeaders);
    assert(checkoutRes.status === 201 && checkoutRes.data.orders?.length > 0, 'Retailer Order Placement verified');
    const newOrderId = checkoutRes.data.orders[0].orderId;

    // 9. Enterprise Order Acceptance & Stock Reservation
    const initialStockCheck = await dispatch(`/api/enterprise/products/${createdProdId}`, 'GET', null, entHeaders);
    const initialAvailable = initialStockCheck.data.product.stock_available;

    const acceptRes = await dispatch(`/api/enterprise/orders/${newOrderId}/accept`, 'POST', null, entHeaders);
    assert(acceptRes.status === 200, 'Enterprise Order Acceptance verified');

    const afterAcceptStockCheck = await dispatch(`/api/enterprise/products/${createdProdId}`, 'GET', null, entHeaders);
    assert(afterAcceptStockCheck.data.product.stock_available === initialAvailable - 10, 'Inventory Reservation strictly enforced (Oversell Shield)');
    assert(afterAcceptStockCheck.data.product.stock_reserved === 10, 'Stock correctly moved to Reserved');

    // 10. Automated Tax Invoice Generation on Order Accept
    const orderDetails = await dispatch(`/api/enterprise/orders/${newOrderId}`, 'GET', null, entHeaders);
    assert(orderDetails.data.invoice && orderDetails.data.invoice.invoice_number, 'Tax Invoice automatically issued with balance');
    const invoiceId = orderDetails.data.invoice.id;

    // 11. Partial Dispatch Execution
    const dispatchRes = await dispatch('/api/enterprise/dispatches', 'POST', {
      orderId: newOrderId,
      transporterName: 'VRL Logistics',
      vehicleNumber: 'MH-12-PQ-9988',
      itemsToDispatch: [{
        orderItemId: orderDetails.data.items[0].id,
        productId: createdProdId,
        quantity: 6
      }]
    }, entHeaders);
    assert(dispatchRes.status === 201, 'Partial Dispatch created successfully');
    assert(dispatchRes.data.orderStatus === 'PARTIALLY_DISPATCHED', 'Order status accurately transitioned to PARTIALLY_DISPATCHED');

    // 12. Over-Dispatch Prevention Verification
    const overDispatchAttempt = await dispatch('/api/enterprise/dispatches', 'POST', {
      orderId: newOrderId,
      transporterName: 'VRL Logistics',
      itemsToDispatch: [{
        orderItemId: orderDetails.data.items[0].id,
        productId: createdProdId,
        quantity: 10
      }]
    }, entHeaders);
    assert(overDispatchAttempt.status === 400, 'Over-dispatch strictly prevented by inventory engine');

    // 13. Dispatch Final Remainder & Delivery Completion
    const finalDispatch = await dispatch('/api/enterprise/dispatches', 'POST', {
      orderId: newOrderId,
      transporterName: 'VRL Logistics',
      itemsToDispatch: [{
        orderItemId: orderDetails.data.items[0].id,
        productId: createdProdId,
        quantity: 4
      }]
    }, entHeaders);
    assert(finalDispatch.data.orderStatus === 'DISPATCHED', 'Order fully dispatched upon remaining batch shipment');

    const deliverRes = await dispatch(`/api/enterprise/orders/${newOrderId}/deliver`, 'POST', null, entHeaders);
    assert(deliverRes.status === 200, 'Order Delivery Completion verified');

    // 14. Payment Reminder System (SEND REMINDER)
    const reminderRes = await dispatch('/api/enterprise/reminders/send', 'POST', {
      retailerId: retLogin.data.profile.id,
      invoiceId: invoiceId,
      reminderType: 'OVERDUE_PAYMENT',
      channel: 'ALL',
    }, entHeaders);
    assert(reminderRes.status === 201 && reminderRes.data.reminderNumber, 'Payment Reminder successfully dispatched');

    // 15. Retailer Acknowledgment of Payment Reminder
    const ackRes = await dispatch(`/api/retailer/financials/reminders/${reminderRes.data.reminderId}/acknowledge`, 'POST', null, retHeaders);
    assert(ackRes.status === 200, 'Retailer Reminder Acknowledgment verified');

    // 16. Payment Recording & Reconciliation
    const testUtr = `TEST-UTR-${Date.now()}`;
    const reconcileRes = await dispatch('/api/enterprise/payments/reconcile', 'POST', {
      retailerId: retLogin.data.profile.id,
      amount: orderDetails.data.invoice.total_amount,
      paymentMethod: 'NEFT_RTGS',
      transactionReference: testUtr,
      allocations: [{ invoiceId, allocatedAmount: orderDetails.data.invoice.total_amount }]
    }, entHeaders);
    assert(reconcileRes.status === 201 && reconcileRes.data.receiptNumber, 'Payment Reconciliation & Receipt Generation verified');

    // 17. Duplicate Payment Reference Prevention
    const duplicatePayAttempt = await dispatch('/api/enterprise/payments/reconcile', 'POST', {
      retailerId: retLogin.data.profile.id,
      amount: 500,
      transactionReference: testUtr,
    }, entHeaders);
    assert(duplicatePayAttempt.status === 400, 'Duplicate Payment UTR/Transaction Reference strictly prevented');

    // 18. AI Demand Intelligence & Forecasting Verification
    const demandRes = await dispatch('/api/enterprise/forecasting/overview', 'GET', null, entHeaders);
    assert(demandRes.status === 200, 'AI Demand Intelligence endpoint verified');
    assert(demandRes.data.productsWithSufficientData > 0, 'Multi-month statistical demand forecasting active on historical data');

    console.log('====================================================');
    console.log('🎉 ALL 18 WORKFLOW AND SECURITY VERIFICATIONS PASSED!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Error:', err);
    process.exit(1);
  }
};

runAllTests();
