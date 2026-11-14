-- VyaparX Database Schema (Relational PostgreSQL-compatible SQLite)
-- Enforces referential integrity, tenant isolation, and auditability

PRAGMA foreign_keys = ON;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ENTERPRISE', 'RETAILER')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. ENTERPRISE PROFILES
CREATE TABLE IF NOT EXISTS enterprise_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    gstin TEXT NOT NULL,
    pan TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code TEXT NOT NULL,
    pincode TEXT NOT NULL,
    logo_url TEXT,
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. RETAILER PROFILES
CREATE TABLE IF NOT EXISTS retailer_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    gstin TEXT,
    gst_type TEXT DEFAULT 'REGULAR' CHECK(gst_type IN ('REGULAR', 'COMPOSITION', 'UNREGISTERED')),
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    state_code TEXT NOT NULL,
    pincode TEXT NOT NULL,
    credit_limit REAL DEFAULT 50000.0,
    current_credit REAL DEFAULT 0.0,
    pricing_preference_margin REAL DEFAULT 18.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. PRODUCT CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT
);

-- 5. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    barcode TEXT,
    description TEXT,
    image_url TEXT,
    uom TEXT NOT NULL DEFAULT 'Pieces',
    base_price REAL NOT NULL,
    gst_rate REAL NOT NULL DEFAULT 18.0,
    hsn_code TEXT NOT NULL,
    wholesale_price REAL NOT NULL,
    suggested_retail_price REAL,
    moq INTEGER NOT NULL DEFAULT 1,
    bulk_pricing_json TEXT, -- JSON array of [{min_qty: 50, price: 95}, {min_qty: 100, price: 90}]
    stock_available INTEGER NOT NULL DEFAULT 0,
    stock_reserved INTEGER NOT NULL DEFAULT 0,
    stock_dispatched INTEGER NOT NULL DEFAULT 0,
    stock_damaged INTEGER NOT NULL DEFAULT 0,
    stock_returned INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DRAFT', 'INACTIVE', 'OUT_OF_STOCK')),
    is_visible INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES product_categories(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_ent_sku ON products(enterprise_id, sku);

-- 6. WAREHOUSES
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    capacity_sqft INTEGER DEFAULT 10000,
    manager_name TEXT,
    manager_phone TEXT,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE
);

-- 7. WAREHOUSE STOCKS
CREATE TABLE IF NOT EXISTS warehouse_stocks (
    id TEXT PRIMARY KEY,
    warehouse_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved INTEGER NOT NULL DEFAULT 0,
    location_aisle TEXT,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(warehouse_id, product_id)
);

-- 8. INVENTORY TRANSACTIONS
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    warehouse_id TEXT,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('PURCHASE_INWARD', 'ORDER_RESERVED', 'ORDER_RELEASED', 'DISPATCH_OUTWARD', 'ADJUSTMENT_DAMAGE', 'ADJUSTMENT_CORRECTION', 'RETURN_INWARD')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_id TEXT,
    reference_type TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 9. SUPPLIER-RETAILER RELATIONSHIPS
CREATE TABLE IF NOT EXISTS supplier_retailer_relationships (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'ON_HOLD', 'BLOCKED')),
    credit_limit REAL DEFAULT 100000.0,
    current_credit REAL DEFAULT 0.0,
    payment_terms_days INTEGER DEFAULT 15,
    auto_reminder_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id) ON DELETE CASCADE,
    UNIQUE(enterprise_id, retailer_id)
);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'ACCEPTED', 'PROCESSING', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED')),
    subtotal REAL NOT NULL,
    cgst_amount REAL NOT NULL DEFAULT 0,
    sgst_amount REAL NOT NULL DEFAULT 0,
    igst_amount REAL NOT NULL DEFAULT 0,
    gst_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK(payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID')),
    shipping_address TEXT NOT NULL,
    delivery_instructions TEXT,
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id)
);

-- 11. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    dispatched_quantity INTEGER NOT NULL DEFAULT 0,
    base_price REAL NOT NULL,
    gst_rate REAL NOT NULL,
    gst_amount REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 12. DISPATCH RECORDS
CREATE TABLE IF NOT EXISTS dispatch_records (
    id TEXT PRIMARY KEY,
    dispatch_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    transporter_name TEXT NOT NULL,
    tracking_number TEXT,
    vehicle_number TEXT,
    driver_phone TEXT,
    waybill_number TEXT,
    dispatch_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATETIME,
    status TEXT NOT NULL DEFAULT 'IN_TRANSIT' CHECK(status IN ('DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id)
);

-- 13. DISPATCH ITEMS
CREATE TABLE IF NOT EXISTS dispatch_items (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL,
    order_item_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (dispatch_id) REFERENCES dispatch_records(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 14. INVOICES
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    subtotal REAL NOT NULL,
    cgst_amount REAL NOT NULL,
    sgst_amount REAL NOT NULL,
    igst_amount REAL NOT NULL,
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0.0,
    balance_amount REAL NOT NULL,
    due_date DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id)
);

-- 15. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('UPI', 'NEFT_RTGS', 'CHEQUE', 'NET_BANKING', 'CASH')),
    transaction_reference TEXT NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    receipt_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id)
);

-- 16. PAYMENT ALLOCATIONS
CREATE TABLE IF NOT EXISTS payment_allocations (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    allocated_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- 17. SETTLEMENTS
CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    settlement_number TEXT UNIQUE NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    total_invoiced REAL NOT NULL,
    total_paid REAL NOT NULL,
    balance_carried_forward REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'CLOSED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id)
);

-- 18. PAYMENT REMINDERS
CREATE TABLE IF NOT EXISTS payment_reminders (
    id TEXT PRIMARY KEY,
    reminder_number TEXT UNIQUE NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    amount_due REAL NOT NULL,
    due_date DATETIME NOT NULL,
    reminder_type TEXT NOT NULL CHECK(reminder_type IN ('UPCOMING_PAYMENT', 'PAYMENT_DUE', 'OVERDUE_PAYMENT', 'FINAL_REMINDER', 'CUSTOM_REMINDER')),
    message TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('IN_APP', 'EMAIL', 'WHATSAPP', 'ALL')),
    schedule_type TEXT DEFAULT 'MANUAL',
    delivery_status TEXT NOT NULL DEFAULT 'DELIVERED' CHECK(delivery_status IN ('PENDING', 'DELIVERED', 'FAILED')),
    delivery_provider_ref TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    acknowledged_at DATETIME,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- 19. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('ORDER', 'DISPATCH', 'PAYMENT', 'REMINDER', 'OFFER', 'SYSTEM')),
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 20. RETAILER PURCHASE HISTORY
CREATE TABLE IF NOT EXISTS retailer_purchase_history (
    id TEXT PRIMARY KEY,
    retailer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    purchase_price REAL NOT NULL,
    purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- 21. RETAILER SELLING RECORDS (For Profit Tracking: Estimated vs Realized)
CREATE TABLE IF NOT EXISTS retailer_selling_records (
    id TEXT PRIMARY KEY,
    retailer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    purchased_qty INTEGER NOT NULL DEFAULT 0,
    sold_qty INTEGER NOT NULL DEFAULT 0,
    purchase_cost_per_unit REAL NOT NULL,
    target_selling_price REAL NOT NULL,
    actual_selling_price REAL,
    realized_profit REAL DEFAULT 0.0,
    is_itc_eligible INTEGER DEFAULT 1,
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE(retailer_id, product_id)
);

-- 22. ORDER RETURNS
CREATE TABLE IF NOT EXISTS order_returns (
    id TEXT PRIMARY KEY,
    return_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    enterprise_id TEXT NOT NULL,
    retailer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED', 'APPROVED', 'RECEIVED', 'REJECTED')),
    refund_amount REAL NOT NULL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (retailer_id) REFERENCES retailer_profiles(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 23. DEMAND FORECASTS
CREATE TABLE IF NOT EXISTS demand_forecasts (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    period TEXT NOT NULL, -- e.g. "2026-12", "2027-01"
    historical_sales INTEGER NOT NULL DEFAULT 0,
    forecast_demand INTEGER NOT NULL,
    lower_bound INTEGER NOT NULL,
    upper_bound INTEGER NOT NULL,
    confidence_score REAL NOT NULL, -- e.g. 0.88 (88%)
    algorithm TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 24. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT,
    retailer_id TEXT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 25. AUTOMATED REMINDER CONFIGURATIONS
CREATE TABLE IF NOT EXISTS reminder_configs (
    id TEXT PRIMARY KEY,
    enterprise_id TEXT NOT NULL UNIQUE,
    is_enabled INTEGER DEFAULT 1,
    before_due_days INTEGER DEFAULT 3,
    on_due_date INTEGER DEFAULT 1,
    after_due_3_days INTEGER DEFAULT 1,
    after_due_7_days INTEGER DEFAULT 1,
    channels TEXT DEFAULT '["IN_APP","EMAIL","WHATSAPP"]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (enterprise_id) REFERENCES enterprise_profiles(id)
);

