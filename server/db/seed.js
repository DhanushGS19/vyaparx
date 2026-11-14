/**
 * VyaparX Database Seed Script
 * Populates realistic commercial B2B demonstration data:
 * - 2 Enterprises (Apex National Distributing, Bharat Agro & Goods)
 * - 3 Retailers (Krishna Supermarket, Gupta Kirana, Mahalaxmi Mart)
 * - 5 Categories & 16 Products across different GST slabs (5%, 12%, 18%)
 * - 5+ Months of historical orders to power the AI Demand Intelligence algorithm
 * - Active orders across NEW, ACCEPTED, PARTIALLY_DISPATCHED, DISPATCHED, and DELIVERED states
 * - Dispatches with partial shipments, vehicle/waybill tracking
 * - Invoices, Payments, Allocations, and Payment Reminders
 */

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb, queryAll, queryOne, run, transaction } from './connection.js';

export const seedDatabase = async () => {
  console.log('🌱 Starting VyaparX Seed Process...');

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('password123', salt);

  const db = getDb();
  db.exec('PRAGMA foreign_keys = OFF;');

  transaction(() => {
    // Clean existing data for clean seed
    const tables = [
      'audit_logs', 'demand_forecasts', 'order_returns', 'retailer_selling_records',
      'retailer_purchase_history', 'notifications', 'payment_reminders', 'settlements',
      'payment_allocations', 'payments', 'invoices', 'dispatch_items', 'dispatch_records',
      'order_items', 'orders', 'supplier_retailer_relationships', 'inventory_transactions',
      'warehouse_stocks', 'warehouses', 'products', 'product_categories',
      'retailer_profiles', 'enterprise_profiles', 'reminder_configs', 'users'
    ];
    for (const t of tables) {
      run(`DELETE FROM ${t};`);
    }

    // 1. PRODUCT CATEGORIES
    const categories = [
      { id: 'cat-fmcg', name: 'Packaged Foods & Staples', slug: 'packaged-foods-staples', description: 'Grains, flour, pulses, cooking oils, and packaged essentials', icon: 'ShoppingBag' },
      { id: 'cat-beverages', name: 'Dairy & Beverages', slug: 'dairy-beverages', description: 'Tea, coffee, packaged dairy, milk powders, and juices', icon: 'Coffee' },
      { id: 'cat-personal', name: 'Personal Care & Hygiene', slug: 'personal-care-hygiene', description: 'Soaps, shampoos, oral care, and cosmetics', icon: 'Sparkles' },
      { id: 'cat-cleaning', name: 'Household & Cleaning', slug: 'household-cleaning', description: 'Detergents, surface cleaners, dishwash, and home care', icon: 'Home' },
      { id: 'cat-snacks', name: 'Snacks & Confectionery', slug: 'snacks-confectionery', description: 'Biscuits, namkeen, chocolates, and chips', icon: 'Cookie' },
    ];

    for (const cat of categories) {
      run(`INSERT INTO product_categories (id, name, slug, description, icon) VALUES (?, ?, ?, ?, ?)`,
        [cat.id, cat.name, cat.slug, cat.description, cat.icon]);
    }

    // 2. ENTERPRISES
    // Enterprise 1: Apex National Distributing Ltd
    const ent1UserId = 'usr-ent-apex';
    const ent1Id = 'ent-apex';
    run(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'ENTERPRISE')`,
      [ent1UserId, 'enterprise@apex.com', commonPasswordHash]);

    run(`
      INSERT INTO enterprise_profiles (
        id, user_id, company_name, trade_name, gstin, pan, phone, email,
        address, city, state, state_code, pincode, bank_name, account_number, ifsc_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ent1Id, ent1UserId, 'Apex National Distributing Ltd', 'Apex Wholesale Direct',
      '27AAACA1234A1Z5', 'AAACA1234A', '+91 98200 11223', 'enterprise@apex.com',
      'Plot 45, Bhiwandi Logistics Corridor, Mankoli Naka', 'Thane / Mumbai', 'Maharashtra', '27', '421302',
      'HDFC Bank Ltd', '50200088991122', 'HDFC0000123'
    ]);

    run(`INSERT INTO reminder_configs (id, enterprise_id) VALUES (?, ?)`, [crypto.randomUUID(), ent1Id]);

    // Primary Warehouse for Apex
    const wh1Id = 'wh-apex-main';
    run(`
      INSERT INTO warehouses (id, enterprise_id, name, code, address, city, state, pincode, capacity_sqft, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 35000, 1)
    `, [wh1Id, ent1Id, 'Apex Central Logistics Hub', 'WH-BHIWANDI-01', 'Plot 45, Bhiwandi Logistics Park', 'Mumbai', 'Maharashtra', '421302']);

    // Enterprise 2: Bharat Agro & Goods Corp
    const ent2UserId = 'usr-ent-bharat';
    const ent2Id = 'ent-bharat';
    run(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'ENTERPRISE')`,
      [ent2UserId, 'enterprise@bharat.com', commonPasswordHash]);

    run(`
      INSERT INTO enterprise_profiles (
        id, user_id, company_name, trade_name, gstin, pan, phone, email,
        address, city, state, state_code, pincode, bank_name, account_number, ifsc_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ent2Id, ent2UserId, 'Bharat Agro & Goods Corp', 'Bharat Agro Distribution',
      '27AAACB5678B1Z2', 'AAACB5678B', '+91 98450 44556', 'enterprise@bharat.com',
      'Gate 12, Chakan Industrial Phase II', 'Pune', 'Maharashtra', '27', '410501',
      'State Bank of India', '389922110034', 'SBIN0000456'
    ]);

    run(`INSERT INTO reminder_configs (id, enterprise_id) VALUES (?, ?)`, [crypto.randomUUID(), ent2Id]);

    // 3. RETAILERS
    // Retailer 1: Krishna Supermarket (Regular GST - ITC Eligible)
    const ret1UserId = 'usr-ret-krishna';
    const ret1Id = 'ret-krishna';
    run(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'RETAILER')`,
      [ret1UserId, 'retailer@krishna.com', commonPasswordHash]);

    run(`
      INSERT INTO retailer_profiles (
        id, user_id, shop_name, owner_name, gstin, gst_type, phone, email,
        address, city, state, state_code, pincode, credit_limit, current_credit, pricing_preference_margin
      ) VALUES (?, ?, ?, ?, ?, 'REGULAR', ?, ?, ?, ?, ?, ?, ?, 150000.0, 32500.0, 18.0)
    `, [
      ret1Id, ret1UserId, 'Krishna Supermarket & Provision Store', 'Rameshwar Sharma',
      '27AABCK4321C1Z8', '+91 98190 22334', 'retailer@krishna.com',
      'Shop 4-5, Shanti Commercial Complex, Andheri East', 'Mumbai', 'Maharashtra', '27', '400069'
    ]);

    // Retailer 2: Gupta Kirana & General Store (Regular GST - ITC Eligible)
    const ret2UserId = 'usr-ret-gupta';
    const ret2Id = 'ret-gupta';
    run(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'RETAILER')`,
      [ret2UserId, 'retailer@gupta.com', commonPasswordHash]);

    run(`
      INSERT INTO retailer_profiles (
        id, user_id, shop_name, owner_name, gstin, gst_type, phone, email,
        address, city, state, state_code, pincode, credit_limit, current_credit, pricing_preference_margin
      ) VALUES (?, ?, ?, ?, ?, 'REGULAR', ?, ?, ?, ?, ?, ?, ?, 100000.0, 18400.0, 20.0)
    `, [
      ret2Id, ret2UserId, 'Gupta Kirana & Wholesale Store', 'Mohanlal Gupta',
      '27AABCG8765D1Z4', '+91 98220 99887', 'retailer@gupta.com',
      'Station Road, Near Teen Haath Naka', 'Thane', 'Maharashtra', '27', '400602'
    ]);

    // Retailer 3: Mahalaxmi Provision Mart (Composition GST - Non-ITC)
    const ret3UserId = 'usr-ret-mahalaxmi';
    const ret3Id = 'ret-mahalaxmi';
    run(`INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'RETAILER')`,
      [ret3UserId, 'retailer@mahalaxmi.com', commonPasswordHash]);

    run(`
      INSERT INTO retailer_profiles (
        id, user_id, shop_name, owner_name, gstin, gst_type, phone, email,
        address, city, state, state_code, pincode, credit_limit, current_credit, pricing_preference_margin
      ) VALUES (?, ?, ?, ?, ?, 'COMPOSITION', ?, ?, ?, ?, ?, ?, ?, 75000.0, 0.0, 15.0)
    `, [
      ret3Id, ret3UserId, 'Mahalaxmi Daily Provision Mart', 'Rajesh Patel',
      '27AABCP1122E1Z9', '+91 98900 77665', 'retailer@mahalaxmi.com',
      'Lane 4, Market Yard, Gultekdi', 'Pune', 'Maharashtra', '27', '411037'
    ]);

    // Supplier-Retailer Relationships
    run(`INSERT INTO supplier_retailer_relationships (id, enterprise_id, retailer_id, credit_limit, payment_terms_days) VALUES (?, ?, ?, 150000, 15)`,
      [crypto.randomUUID(), ent1Id, ret1Id]);
    run(`INSERT INTO supplier_retailer_relationships (id, enterprise_id, retailer_id, credit_limit, payment_terms_days) VALUES (?, ?, ?, 100000, 21)`,
      [crypto.randomUUID(), ent1Id, ret2Id]);
    run(`INSERT INTO supplier_retailer_relationships (id, enterprise_id, retailer_id, credit_limit, payment_terms_days) VALUES (?, ?, ?, 75000, 10)`,
      [crypto.randomUUID(), ent1Id, ret3Id]);
    run(`INSERT INTO supplier_retailer_relationships (id, enterprise_id, retailer_id, credit_limit, payment_terms_days) VALUES (?, ?, ?, 80000, 15)`,
      [crypto.randomUUID(), ent2Id, ret1Id]);

    // 4. PRODUCTS (Apex & Bharat)
    const productsData = [
      // Apex Products
      {
        id: 'prod-oil-sunflower',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'SunPure Refined Sunflower Oil (1 Litre Pouch)',
        sku: 'OIL-SUN-1L',
        barcode: '890123450011',
        description: 'Triple refined high-clarity sunflower cooking oil with Vitamin A & D fortifiers.',
        image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (12 Pouches)',
        base_price: 1320.0,
        gst_rate: 5.0,
        hsn_code: '1512',
        wholesale_price: 1260.0,
        suggested_retail_price: 1560.0,
        moq: 5,
        bulk_pricing: [{ min_qty: 25, price: 1230.0 }, { min_qty: 50, price: 1200.0 }],
        stock_available: 450,
        stock_reserved: 50,
        stock_dispatched: 1800,
      },
      {
        id: 'prod-fortune-oil',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'Fortune Sunlite Refined Sunflower Oil (1L Pouch - Box of 15)',
        sku: 'OIL-FOR-15L',
        barcode: '890123450154',
        description: 'Light, healthy and easy to digest edible cooking oil fortified with essential vitamins.',
        image_url: 'https://images.unsplash.com/photo-1608797178974-15b35a61dede?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (15 Pouches)',
        base_price: 1800.0,
        gst_rate: 5.0,
        hsn_code: '1512',
        wholesale_price: 1710.0,
        suggested_retail_price: 2100.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 15, price: 1660.0 }, { min_qty: 30, price: 1620.0 }],
        stock_available: 360,
        stock_reserved: 30,
        stock_dispatched: 1400,
      },
      {
        id: 'prod-dhara-mustard',
        enterprise_id: ent2Id,
        category_id: 'cat-fmcg',
        name: 'Dhara Kachi Ghani Pure Mustard Oil (1L Bottle - Case of 12)',
        sku: 'OIL-DHA-12L',
        barcode: '890987650033',
        description: 'Traditional cold-pressed mustard oil with pungent natural aroma and zero trans fats.',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles)',
        base_price: 1860.0,
        gst_rate: 5.0,
        hsn_code: '1514',
        wholesale_price: 1740.0,
        suggested_retail_price: 2160.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 1690.0 }],
        stock_available: 290,
        stock_reserved: 20,
        stock_dispatched: 850,
      },
      {
        id: 'prod-parachute-oil',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Parachute 100% Pure Coconut Hair Oil (250ml - Box of 24 Bottles)',
        sku: 'OIL-PAR-24PK',
        barcode: '890123450165',
        description: '5-stage filtered pure coconut oil made from naturally dried copra coconuts.',
        image_url: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (24 Bottles)',
        base_price: 2400.0,
        gst_rate: 5.0,
        hsn_code: '3305',
        wholesale_price: 2200.0,
        suggested_retail_price: 2880.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2140.0 }, { min_qty: 25, price: 2080.0 }],
        stock_available: 310,
        stock_reserved: 25,
        stock_dispatched: 1250,
      },
      {
        id: 'prod-dabur-amla',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Dabur Amla Hair Oil for Strong & Long Hair (275ml - Box of 16)',
        sku: 'OIL-AML-16PK',
        barcode: '890123450176',
        description: 'Amla berry enriched nourishing hair oil that strengthens roots from deep within.',
        image_url: 'https://images.unsplash.com/photo-1608248597359-2a9042b3bfbb?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (16 Bottles)',
        base_price: 1840.0,
        gst_rate: 18.0,
        hsn_code: '3305',
        wholesale_price: 1680.0,
        suggested_retail_price: 2240.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 1620.0 }],
        stock_available: 250,
        stock_reserved: 20,
        stock_dispatched: 980,
      },
      {
        id: 'prod-colgate-brush',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Colgate ZigZag Deep Clean Toothbrush (Medium) - Card of 12',
        sku: 'BRS-COL-12PK',
        barcode: '890123450088',
        description: 'Cross-angle multi-level bristles designed to reach deep between teeth with soft tongue cleaner.',
        image_url: 'https://images.unsplash.com/photo-1559591937-e109d949ecb7?w=500&auto=format&fit=crop&q=80',
        uom: 'Card (12 Brushes)',
        base_price: 340.0,
        gst_rate: 18.0,
        hsn_code: '9603',
        wholesale_price: 310.0,
        suggested_retail_price: 480.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 295.0 }, { min_qty: 25, price: 280.0 }],
        stock_available: 400,
        stock_reserved: 35,
        stock_dispatched: 1600,
      },
      {
        id: 'prod-oralb-brush',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Oral-B Shiny Clean Soft Toothbrush - Outer Box of 24',
        sku: 'BRS-ORB-24PK',
        barcode: '890123450099',
        description: 'End-rounded flexible wave bristles gentle on enamel and gums with ergonomic anti-slip grip.',
        image_url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (24 Brushes)',
        base_price: 520.0,
        gst_rate: 18.0,
        hsn_code: '9603',
        wholesale_price: 480.0,
        suggested_retail_price: 720.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 450.0 }],
        stock_available: 350,
        stock_reserved: 30,
        stock_dispatched: 1200,
      },
      {
        id: 'prod-colgate-paste',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Colgate Strong Teeth Calcium & Minerals Toothpaste (150g x 6 Tubes)',
        sku: 'PST-COL-150G',
        barcode: '890123450110',
        description: 'Calcium boosting Amino Shakti formula that repairs weak enamel and combats cavity germs.',
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
        uom: 'Bundle (6 Tubes)',
        base_price: 540.0,
        gst_rate: 18.0,
        hsn_code: '3306',
        wholesale_price: 490.0,
        suggested_retail_price: 660.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 15, price: 470.0 }],
        stock_available: 420,
        stock_reserved: 40,
        stock_dispatched: 1750,
      },
      {
        id: 'prod-dettol-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Dettol Original Germ Protection Bathing Bar (125g x 5 Pack - Box of 20)',
        sku: 'SOP-DET-20PK',
        barcode: '890123450066',
        description: 'Trusted pine fragrance antibacterial skin cleansing bar with 99.9% illness germ protection.',
        image_url: 'https://images.unsplash.com/photo-1607006314605-4b0559f3e9c6?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (20 Packs of 5)',
        base_price: 3600.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 3320.0,
        suggested_retail_price: 4100.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 3240.0 }, { min_qty: 25, price: 3160.0 }],
        stock_available: 280,
        stock_reserved: 25,
        stock_dispatched: 1150,
      },
      {
        id: 'prod-lifebuoy-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Lifebuoy Total 10 Germ Protection Soap (100g x 4 Pack - Box of 24)',
        sku: 'SOP-LIF-24PK',
        barcode: '890123450121',
        description: 'Activ Silver+ formula that fights 99.9% of bacteria and viral impurities.',
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (24 Packs of 4)',
        base_price: 2760.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2520.0,
        suggested_retail_price: 3120.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2440.0 }, { min_qty: 25, price: 2380.0 }],
        stock_available: 310,
        stock_reserved: 30,
        stock_dispatched: 1350,
      },
      {
        id: 'prod-dove-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Dove White Beauty Moisture Bathing Bar (100g x 3 Pack - Box of 16)',
        sku: 'SOP-DOV-16PK',
        barcode: '890123450132',
        description: 'Enriched with 1/4th moisturizing cream and gentle cleansers for softer, glowing skin.',
        image_url: 'https://images.unsplash.com/photo-1608248597359-2a9042b3bfbb?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (16 Packs of 3)',
        base_price: 3150.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2880.0,
        suggested_retail_price: 3680.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2790.0 }],
        stock_available: 210,
        stock_reserved: 15,
        stock_dispatched: 920,
      },
      {
        id: 'prod-lux-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Lux Rose & Vitamin E Glowing Skin Soap (100g x 4 Pack - Box of 20)',
        sku: 'SOP-LUX-20PK',
        barcode: '890123450143',
        description: 'Floral beauty soap crafted with French rose oil essence and vitamin E for glowing skin.',
        image_url: 'https://images.unsplash.com/photo-1594824813576-905167098e9b?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (20 Packs of 4)',
        base_price: 2400.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2180.0,
        suggested_retail_price: 2800.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2120.0 }],
        stock_available: 300,
        stock_reserved: 25,
        stock_dispatched: 1100,
      },
      {
        id: 'prod-clinic-plus',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Clinic Plus Strong & Long Health Shampoo (340ml - Case of 12 Bottles)',
        sku: 'SHP-CLN-12PK',
        barcode: '890123450187',
        description: 'Milk protein formula that nourishes hair from root to tip, making it 35x stronger.',
        image_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles)',
        base_price: 2160.0,
        gst_rate: 18.0,
        hsn_code: '3305',
        wholesale_price: 1960.0,
        suggested_retail_price: 2580.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 1900.0 }],
        stock_available: 220,
        stock_reserved: 20,
        stock_dispatched: 880,
      },
      {
        id: 'prod-surf-excel',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Surf Excel Quick Wash Detergent Powder (4kg + Bucket)',
        sku: 'DET-SRF-4KG',
        barcode: '890123450055',
        description: 'Advanced x-tra clean stain removal detergent formulation with oxygen boosters.',
        image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (6 Packs)',
        base_price: 3600.0,
        gst_rate: 18.0,
        hsn_code: '3402',
        wholesale_price: 3380.0,
        suggested_retail_price: 4140.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 15, price: 3280.0 }, { min_qty: 30, price: 3190.0 }],
        stock_available: 220,
        stock_reserved: 25,
        stock_dispatched: 890,
      },
      {
        id: 'prod-rin-bar',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Rin Advanced Detergent Bar (250g - Carton of 48 Bars)',
        sku: 'DET-RIN-48BR',
        barcode: '890123450198',
        description: 'Deep clean whitening technology with double optical brighteners for brilliant whites.',
        image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (48 Bars)',
        base_price: 960.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 860.0,
        suggested_retail_price: 1152.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 12, price: 830.0 }, { min_qty: 25, price: 800.0 }],
        stock_available: 480,
        stock_reserved: 45,
        stock_dispatched: 2200,
      },
      {
        id: 'prod-vim-bar',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Vim Lemon Dishwash Bar (135g - Outer of 36 Bars)',
        sku: 'DSH-VIM-36PK',
        barcode: '890123450209',
        description: 'Power of 100 lemons degreasing formulation with waterproof protective coating.',
        image_url: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (36 Bars)',
        base_price: 540.0,
        gst_rate: 18.0,
        hsn_code: '3402',
        wholesale_price: 480.0,
        suggested_retail_price: 648.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 15, price: 460.0 }, { min_qty: 30, price: 440.0 }],
        stock_available: 520,
        stock_reserved: 50,
        stock_dispatched: 2400,
      },
      {
        id: 'prod-tata-salt',
        enterprise_id: ent2Id,
        category_id: 'cat-fmcg',
        name: 'Tata Vacuum Evaporated Iodized Salt (1kg Pack - Bale of 25 Bags)',
        sku: 'SLT-TAT-25KG',
        barcode: '890987650044',
        description: 'Desh Ka Namak - vacuum evaporated 99.9% pure salt with optimal iodine content for healthy development.',
        image_url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80',
        uom: 'Bale (25 Bags)',
        base_price: 625.0,
        gst_rate: 5.0,
        hsn_code: '2501',
        wholesale_price: 575.0,
        suggested_retail_price: 750.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 550.0 }],
        stock_available: 600,
        stock_reserved: 50,
        stock_dispatched: 2800,
      },
      {
        id: 'prod-rice-basmati',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'Kohinoor Royal Basmati Rice (25kg Bag)',
        sku: 'RICE-BAS-25KG',
        barcode: '890123450022',
        description: 'Aged extra long grain authentic Dehradun basmati rice with fragrant aroma.',
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
        uom: 'Bag (25 Kg)',
        base_price: 2450.0,
        gst_rate: 5.0,
        hsn_code: '1006',
        wholesale_price: 2350.0,
        suggested_retail_price: 2850.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2300.0 }, { min_qty: 25, price: 2240.0 }],
        stock_available: 280,
        stock_reserved: 30,
        stock_dispatched: 920,
      },
      {
        id: 'prod-atta-chakki',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'Aashirvaad Shudh Chakki Fresh Atta (10kg Pack)',
        sku: 'ATTA-ASH-10KG',
        barcode: '890123450033',
        description: '100% pure whole wheat stone-ground chakki flour with 0% maida.',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
        uom: 'Bundle (5 Packs)',
        base_price: 2100.0,
        gst_rate: 5.0,
        hsn_code: '1101',
        wholesale_price: 1980.0,
        suggested_retail_price: 2350.0,
        moq: 4,
        bulk_pricing: [{ min_qty: 20, price: 1920.0 }, { min_qty: 50, price: 1880.0 }],
        stock_available: 310,
        stock_reserved: 40,
        stock_dispatched: 1100,
      },
      {
        id: 'prod-tea-gold',
        enterprise_id: ent1Id,
        category_id: 'cat-beverages',
        name: 'Tata Tea Gold CTC & Long Leaves (1kg Pack)',
        sku: 'TEA-TAT-1KG',
        barcode: '890123450044',
        description: 'Exquisite blend of strong Assam CTC tea enriched with 15% selected long leaves.',
        image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (10 Packs)',
        base_price: 4900.0,
        gst_rate: 5.0,
        hsn_code: '0902',
        wholesale_price: 4650.0,
        suggested_retail_price: 5500.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 4500.0 }, { min_qty: 25, price: 4400.0 }],
        stock_available: 180,
        stock_reserved: 20,
        stock_dispatched: 640,
      },
      {
        id: 'prod-parle-g',
        enterprise_id: ent1Id,
        category_id: 'cat-snacks',
        name: 'Parle-G Original Glucose Biscuits (800g Super Saver)',
        sku: 'BSC-PAR-800G',
        barcode: '890123450077',
        description: 'India\'s favourite wholesome glucose biscuits pack.',
        image_url: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (30 Packs)',
        base_price: 2700.0,
        gst_rate: 12.0,
        hsn_code: '1905',
        wholesale_price: 2520.0,
        suggested_retail_price: 3000.0,
        moq: 5,
        bulk_pricing: [{ min_qty: 20, price: 2450.0 }, { min_qty: 50, price: 2380.0 }],
        stock_available: 540,
        stock_reserved: 60,
        stock_dispatched: 2400,
      },
      // Bharat Agro Products
      {
        id: 'prod-bharat-toordal',
        enterprise_id: ent2Id,
        category_id: 'cat-fmcg',
        name: 'Bharat Unpolished Latur Toor Dal (30kg Bag)',
        sku: 'DAL-TOO-30KG',
        barcode: '890987650011',
        description: 'Nutrient rich water-polished toor pulse directly sourced from Marathwada farmers.',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        uom: 'Bag (30 Kg)',
        base_price: 4650.0,
        gst_rate: 5.0,
        hsn_code: '0713',
        wholesale_price: 4400.0,
        suggested_retail_price: 5250.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 4280.0 }],
        stock_available: 190,
        stock_reserved: 20,
        stock_dispatched: 550,
      },
      {
        id: 'prod-bharat-ghee',
        enterprise_id: ent2Id,
        category_id: 'cat-beverages',
        name: 'GauDhan Pure A2 Desi Cow Ghee (1 Litre Glass Jar)',
        sku: 'GHE-GAU-1L',
        barcode: '890987650022',
        description: 'Traditional bilona churned aromatic A2 Vedic clarified butter.',
        image_url: 'https://images.unsplash.com/photo-1627998793680-452102146903?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (12 Jars)',
        base_price: 9600.0,
        gst_rate: 12.0,
        hsn_code: '0405',
        wholesale_price: 8900.0,
        suggested_retail_price: 11400.0,
        moq: 1,
        bulk_pricing: [{ min_qty: 5, price: 8600.0 }],
        stock_available: 85,
        stock_reserved: 10,
        stock_dispatched: 220,
      },
      // Additional Daily Essentials (Over 35+ Wholesale SKUs)
      {
        id: 'prod-sensodyne-brush',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Sensodyne Daily Care Soft Gentle Toothbrush (Pack of 12)',
        sku: 'BRS-SEN-12PK',
        barcode: '890123450220',
        description: 'Specially engineered soft micro-fine bristles designed for sensitive teeth and gum margins.',
        image_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&auto=format&fit=crop&q=80',
        uom: 'Card (12 Brushes)',
        base_price: 660.0,
        gst_rate: 18.0,
        hsn_code: '9603',
        wholesale_price: 600.0,
        suggested_retail_price: 840.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 570.0 }],
        stock_available: 240,
        stock_reserved: 15,
        stock_dispatched: 600,
      },
      {
        id: 'prod-closeup-paste',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Close-Up Everfresh Red Hot Gel Toothpaste (150g x 6 Tubes)',
        sku: 'PST-CLO-150G',
        barcode: '890123450231',
        description: 'Anti-bacterial zinc mouthwash infused spicy red gel formula giving 12-hour fresh breath.',
        image_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
        uom: 'Bundle (6 Tubes)',
        base_price: 570.0,
        gst_rate: 18.0,
        hsn_code: '3306',
        wholesale_price: 510.0,
        suggested_retail_price: 720.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 485.0 }],
        stock_available: 320,
        stock_reserved: 25,
        stock_dispatched: 1100,
      },
      {
        id: 'prod-pepsodent-paste',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Pepsodent 2-in-1 Germi Check Toothpaste (150g x 6 Tubes)',
        sku: 'PST-PEP-150G',
        barcode: '890123450242',
        description: 'Advanced germ protection with active fluoride to fight cavities and strengthen gums.',
        image_url: 'https://images.unsplash.com/photo-1563178406-4cdc2923acbc?w=500&auto=format&fit=crop&q=80',
        uom: 'Bundle (6 Tubes)',
        base_price: 510.0,
        gst_rate: 18.0,
        hsn_code: '3306',
        wholesale_price: 460.0,
        suggested_retail_price: 630.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 12, price: 440.0 }],
        stock_available: 360,
        stock_reserved: 30,
        stock_dispatched: 1250,
      },
      {
        id: 'prod-pears-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Pears Pure & Gentle Glycerine Soap (75g x 3 Pack - Box of 24)',
        sku: 'SOP-PRS-24PK',
        barcode: '890123450253',
        description: 'Made with 98% pure glycerine and natural oils for gentle moisture and clear skin.',
        image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (24 Packs of 3)',
        base_price: 2880.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2620.0,
        suggested_retail_price: 3360.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2540.0 }],
        stock_available: 210,
        stock_reserved: 20,
        stock_dispatched: 840,
      },
      {
        id: 'prod-santoor-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Santoor Sandalwood & Turmeric Bathing Bar (100g x 4 Pack - Box of 24)',
        sku: 'SOP-SAN-24PK',
        barcode: '890123450264',
        description: 'Infused with precious sandalwood and turmeric extracts for naturally youthful skin.',
        image_url: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (24 Packs of 4)',
        base_price: 2640.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2400.0,
        suggested_retail_price: 3072.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2320.0 }],
        stock_available: 340,
        stock_reserved: 30,
        stock_dispatched: 1400,
      },
      {
        id: 'prod-medimix-soap',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Medimix 18 Ayurvedic Herbs Classic Soap (125g x 5 Pack - Box of 20)',
        sku: 'SOP-MED-20PK',
        barcode: '890123450275',
        description: 'Authentic Ayurvedic formulation of 18 herbal extracts fighting blemishes and skin issues.',
        image_url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (20 Packs of 5)',
        base_price: 3100.0,
        gst_rate: 18.0,
        hsn_code: '3401',
        wholesale_price: 2850.0,
        suggested_retail_price: 3600.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2750.0 }],
        stock_available: 190,
        stock_reserved: 15,
        stock_dispatched: 780,
      },
      {
        id: 'prod-saffola-gold',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'Saffola Gold Pro Healthy Lifestyle Blended Cooking Oil (1L Pouch - Box of 16)',
        sku: 'OIL-SAF-16L',
        barcode: '890123450286',
        description: 'Dual-seed blend of rice bran and sunflower oil with natural Oryzanol for heart health.',
        image_url: 'https://images.unsplash.com/photo-1518843875459-f738682238a6?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (16 Pouches)',
        base_price: 2480.0,
        gst_rate: 5.0,
        hsn_code: '1517',
        wholesale_price: 2320.0,
        suggested_retail_price: 2880.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2260.0 }],
        stock_available: 280,
        stock_reserved: 25,
        stock_dispatched: 1100,
      },
      {
        id: 'prod-gemini-oil',
        enterprise_id: ent2Id,
        category_id: 'cat-fmcg',
        name: 'Gemini Pure Filtered Groundnut Cooking Oil (1L Pouch - Box of 15)',
        sku: 'OIL-GEM-15L',
        barcode: '890987650055',
        description: 'Traditional Saurashtra groundnut oil with authentic peanut taste and aroma.',
        image_url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (15 Pouches)',
        base_price: 2475.0,
        gst_rate: 5.0,
        hsn_code: '1508',
        wholesale_price: 2325.0,
        suggested_retail_price: 2850.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 2250.0 }],
        stock_available: 210,
        stock_reserved: 20,
        stock_dispatched: 850,
      },
      {
        id: 'prod-bajaj-almond',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Bajaj Almond Drops Non-Sticky Hair Oil with Vitamin E (200ml - Box of 18)',
        sku: 'OIL-BAJ-18PK',
        barcode: '890123450297',
        description: '6x vitamin E enriched non-sticky light almond hair oil reducing hair fall.',
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (18 Bottles)',
        base_price: 2160.0,
        gst_rate: 18.0,
        hsn_code: '3305',
        wholesale_price: 1980.0,
        suggested_retail_price: 2520.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 1910.0 }],
        stock_available: 260,
        stock_reserved: 20,
        stock_dispatched: 920,
      },
      {
        id: 'prod-head-shoulders',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Head & Shoulders Cool Menthol Anti-Dandruff Shampoo (340ml - Case of 12)',
        sku: 'SHP-HNS-12PK',
        barcode: '890123450308',
        description: 'Clinically proven zinc pyrithione formula that eliminates up to 100% visible dandruff.',
        image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles)',
        base_price: 3720.0,
        gst_rate: 18.0,
        hsn_code: '3305',
        wholesale_price: 3420.0,
        suggested_retail_price: 4320.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 3300.0 }],
        stock_available: 175,
        stock_reserved: 15,
        stock_dispatched: 620,
      },
      {
        id: 'prod-sunsilk-black',
        enterprise_id: ent1Id,
        category_id: 'cat-personal',
        name: 'Sunsilk Stunning Black Shine Amla Pearl Shampoo (370ml - Case of 12)',
        sku: 'SHP-SUN-12PK',
        barcode: '890123450319',
        description: 'Co-created with hair experts, enriched with amla pearl complex for lustrous black shine.',
        image_url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles)',
        base_price: 2760.0,
        gst_rate: 18.0,
        hsn_code: '3305',
        wholesale_price: 2520.0,
        suggested_retail_price: 3240.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 2440.0 }],
        stock_available: 230,
        stock_reserved: 20,
        stock_dispatched: 890,
      },
      {
        id: 'prod-ariel-powder',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Ariel Matic Front & Top Load Detergent Powder (2kg - Box of 8 Packs)',
        sku: 'DET-ARI-8PK',
        barcode: '890123450320',
        description: 'Enzyme boosted formula delivering brilliant stain removal in 1 wash for automatic machines.',
        image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (8 Packs of 2kg)',
        base_price: 3680.0,
        gst_rate: 18.0,
        hsn_code: '3402',
        wholesale_price: 3360.0,
        suggested_retail_price: 4320.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 3250.0 }],
        stock_available: 160,
        stock_reserved: 15,
        stock_dispatched: 580,
      },
      {
        id: 'prod-tide-plus',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Tide Plus Extra Power Detergent Powder with Jasmine & Rose (1kg - Box of 16)',
        sku: 'DET-TID-16PK',
        barcode: '890123450331',
        description: 'Double power whitening technology with lingering fragrance of jasmine and fresh rose.',
        image_url: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (16 Packs of 1kg)',
        base_price: 1840.0,
        gst_rate: 18.0,
        hsn_code: '3402',
        wholesale_price: 1660.0,
        suggested_retail_price: 2160.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 1600.0 }],
        stock_available: 310,
        stock_reserved: 25,
        stock_dispatched: 1200,
      },
      {
        id: 'prod-pril-liquid',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Pril Kraft Lime Active Degreasing Dishwash Liquid (425ml - Box of 24)',
        sku: 'DSH-PRI-24PK',
        barcode: '890123450342',
        description: 'Super concentrated power booster dishwashing gel that melts burnt grease effortlessly.',
        image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (24 Bottles)',
        base_price: 2520.0,
        gst_rate: 18.0,
        hsn_code: '3402',
        wholesale_price: 2280.0,
        suggested_retail_price: 2976.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 2190.0 }],
        stock_available: 220,
        stock_reserved: 20,
        stock_dispatched: 760,
      },
      {
        id: 'prod-harpic-cleaner',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Harpic Power Plus 10X Max Clean Toilet Disinfectant (1L - Case of 12 Bottles)',
        sku: 'CLN-HAR-12L',
        barcode: '890123450353',
        description: 'Thick blue liquid formula adhering to surfaces for 99.9% germ kill and limescale removal.',
        image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles of 1L)',
        base_price: 2280.0,
        gst_rate: 18.0,
        hsn_code: '3808',
        wholesale_price: 2060.0,
        suggested_retail_price: 2640.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 1980.0 }],
        stock_available: 270,
        stock_reserved: 25,
        stock_dispatched: 980,
      },
      {
        id: 'prod-lizol-cleaner',
        enterprise_id: ent1Id,
        category_id: 'cat-cleaning',
        name: 'Lizol Citrus Power Disinfectant Floor & Surface Cleaner (1L - Case of 12)',
        sku: 'CLN-LIZ-12L',
        barcode: '890123450364',
        description: 'Hospital grade disinfection floor cleaner with refreshing citrus aroma.',
        image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500&auto=format&fit=crop&q=80',
        uom: 'Case (12 Bottles of 1L)',
        base_price: 2460.0,
        gst_rate: 18.0,
        hsn_code: '3808',
        wholesale_price: 2220.0,
        suggested_retail_price: 2880.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 2140.0 }],
        stock_available: 290,
        stock_reserved: 20,
        stock_dispatched: 1050,
      },
      {
        id: 'prod-fortune-besan',
        enterprise_id: ent1Id,
        category_id: 'cat-fmcg',
        name: 'Fortune Pure Chana Dal Besan / Gram Flour (1kg - Bundle of 20 Packs)',
        sku: 'BSN-FOR-20KG',
        barcode: '890123450375',
        description: '100% pure premium chana pulse flour processed hygienically for lumps-free cooking.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b3015f2169?w=500&auto=format&fit=crop&q=80',
        uom: 'Bale (20 Packs of 1kg)',
        base_price: 1900.0,
        gst_rate: 5.0,
        hsn_code: '1106',
        wholesale_price: 1780.0,
        suggested_retail_price: 2200.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 10, price: 1720.0 }],
        stock_available: 340,
        stock_reserved: 30,
        stock_dispatched: 1150,
      },
      {
        id: 'prod-taj-mahal-tea',
        enterprise_id: ent1Id,
        category_id: 'cat-beverages',
        name: 'Brooke Bond Taj Mahal Rich CTC Tea (500g Pack - Box of 16)',
        sku: 'TEA-TAJ-16PK',
        barcode: '890123450386',
        description: 'Iconic royal blend crafted from precious tender tea leaves for unmatched strength and flavor.',
        image_url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=80',
        uom: 'Box (16 Packs of 500g)',
        base_price: 5200.0,
        gst_rate: 5.0,
        hsn_code: '0902',
        wholesale_price: 4880.0,
        suggested_retail_price: 5920.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 4720.0 }],
        stock_available: 150,
        stock_reserved: 10,
        stock_dispatched: 540,
      },
      {
        id: 'prod-nescafe-classic',
        enterprise_id: ent1Id,
        category_id: 'cat-beverages',
        name: 'Nescafe Classic 100% Pure Instant Coffee Glass Jar (100g - Box of 12)',
        sku: 'COF-NES-12PK',
        barcode: '890123450397',
        description: 'Made from select medium-dark roasted Robusta coffee beans for rich full-bodied aroma.',
        image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
        uom: 'Outer (12 Glass Jars of 100g)',
        base_price: 3600.0,
        gst_rate: 18.0,
        hsn_code: '2101',
        wholesale_price: 3300.0,
        suggested_retail_price: 4200.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 6, price: 3180.0 }],
        stock_available: 190,
        stock_reserved: 15,
        stock_dispatched: 640,
      },
      {
        id: 'prod-britannia-goodday',
        enterprise_id: ent1Id,
        category_id: 'cat-snacks',
        name: 'Britannia Good Day Rich Butter Cookies (600g Saver - Carton of 24 Packs)',
        sku: 'BSC-BRI-24PK',
        barcode: '890123450408',
        description: 'Crunchy golden smile cookies packed with rich butter flavor and melt-in-mouth texture.',
        image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
        uom: 'Carton (24 Packs of 600g)',
        base_price: 2400.0,
        gst_rate: 12.0,
        hsn_code: '1905',
        wholesale_price: 2220.0,
        suggested_retail_price: 2880.0,
        moq: 3,
        bulk_pricing: [{ min_qty: 10, price: 2150.0 }],
        stock_available: 380,
        stock_reserved: 35,
        stock_dispatched: 1600,
      },
      {
        id: 'prod-bharat-moongdal',
        enterprise_id: ent2Id,
        category_id: 'cat-fmcg',
        name: 'Bharat Premium Dhuli Yellow Moong Dal (30kg Bag)',
        sku: 'DAL-MNG-30KG',
        barcode: '890987650066',
        description: 'Sortex cleaned pure split yellow moong pulse packed with light easy-to-digest protein.',
        image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
        uom: 'Bag (30 Kg)',
        base_price: 3750.0,
        gst_rate: 5.0,
        hsn_code: '0713',
        wholesale_price: 3550.0,
        suggested_retail_price: 4350.0,
        moq: 2,
        bulk_pricing: [{ min_qty: 8, price: 3450.0 }],
        stock_available: 220,
        stock_reserved: 20,
        stock_dispatched: 720,
      }
    ];

    for (const p of productsData) {
      run(`
        INSERT INTO products (
          id, enterprise_id, category_id, name, sku, barcode, description, image_url,
          uom, base_price, gst_rate, hsn_code, wholesale_price, suggested_retail_price,
          moq, bulk_pricing_json, stock_available, stock_reserved, stock_dispatched, status, is_visible
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 1)
      `, [
        p.id, p.enterprise_id, p.category_id, p.name, p.sku, p.barcode, p.description, p.image_url,
        p.uom, p.base_price, p.gst_rate, p.hsn_code, p.wholesale_price, p.suggested_retail_price,
        p.moq, JSON.stringify(p.bulk_pricing || []), p.stock_available, p.stock_reserved, p.stock_dispatched
      ]);
    }

    // 5. HISTORICAL ORDERS ACROSS 5 MONTHS (June 2026 to Oct 2026)
    // To power AI Demand Forecasting with authentic variance and statistical trends
    const historicalMonths = [
      { month: '2026-06', multiplier: 0.85, dateStr: '2026-06-12 11:20:00' },
      { month: '2026-07', multiplier: 0.92, dateStr: '2026-07-15 14:10:00' },
      { month: '2026-08', multiplier: 1.05, dateStr: '2026-08-18 10:45:00' },
      { month: '2026-09', multiplier: 1.15, dateStr: '2026-09-22 16:30:00' },
      { month: '2026-10', multiplier: 1.28, dateStr: '2026-10-10 12:15:00' },
    ];

    let histSeq = 100;
    for (const hm of historicalMonths) {
      // Create 2 fulfilled historical orders per month for Apex
      for (const ret of [ret1Id, ret2Id]) {
        histSeq++;
        const oId = `ord-hist-${histSeq}`;
        const oNum = `ORD-2026-${String(histSeq).padStart(5, '0')}`;
        const sunflowerQty = Math.round(20 * hm.multiplier);
        const basmatiQty = Math.round(10 * hm.multiplier);

        const subtotal = (sunflowerQty * 1260) + (basmatiQty * 2350);
        const gst = subtotal * 0.05;
        const total = subtotal + gst;

        run(`
          INSERT INTO orders (
            id, order_number, enterprise_id, retailer_id, status, subtotal,
            cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
            payment_status, shipping_address, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'DELIVERED', ?, ?, ?, 0, ?, ?, 'PAID', 'Retailer Registered Store Address', ?, ?)
        `, [oId, oNum, ent1Id, ret, subtotal, gst / 2, gst / 2, gst, total, hm.dateStr, hm.dateStr]);

        // Items
        run(`
          INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
          VALUES (?, ?, 'prod-oil-sunflower', ?, ?, 1260, 5, ?, ?)
        `, [crypto.randomUUID(), oId, sunflowerQty, sunflowerQty, (sunflowerQty * 1260 * 0.05), (sunflowerQty * 1260 * 1.05)]);

        run(`
          INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
          VALUES (?, ?, 'prod-rice-basmati', ?, ?, 2350, 5, ?, ?)
        `, [crypto.randomUUID(), oId, basmatiQty, basmatiQty, (basmatiQty * 2350 * 0.05), (basmatiQty * 2350 * 1.05)]);

        // Historical Invoice
        const invId = `inv-hist-${histSeq}`;
        run(`
          INSERT INTO invoices (
            id, invoice_number, order_id, enterprise_id, retailer_id,
            subtotal, cgst_amount, sgst_amount, igst_amount, total_amount,
            paid_amount, balance_amount, due_date, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, 'PAID', ?)
        `, [
          invId, `INV-2026-${String(histSeq).padStart(5, '0')}`, oId, ent1Id, ret,
          subtotal, gst / 2, gst / 2, total, total, hm.dateStr, hm.dateStr
        ]);

        // Historical Payment
        const payId = `pay-hist-${histSeq}`;
        run(`
          INSERT INTO payments (
            id, payment_number, enterprise_id, retailer_id, amount, payment_method,
            transaction_reference, payment_date, receipt_number, created_at
          ) VALUES (?, ?, ?, ?, ?, 'NEFT_RTGS', ?, ?, ?, ?)
        `, [
          payId, `PAY-2026-${String(histSeq).padStart(5, '0')}`, ent1Id, ret, total,
          `HDFC-NEFT-${histSeq}8899`, hm.dateStr, `RCP-2026-${String(histSeq).padStart(5, '0')}`, hm.dateStr
        ]);

        run(`
          INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at)
          VALUES (?, ?, ?, ?, ?)
        `, [crypto.randomUUID(), payId, invId, total, hm.dateStr]);
      }
    }

    // 6. CURRENT ACTIVE ORDERS (November 2026)
    // Order A: NEW order waiting for Enterprise acceptance
    const ordNewId = 'ord-cur-new-01';
    run(`
      INSERT INTO orders (
        id, order_number, enterprise_id, retailer_id, status, subtotal,
        cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
        payment_status, shipping_address, delivery_instructions, created_at
      ) VALUES (?, 'ORD-2026-00301', ?, ?, 'NEW', 15120.0, 378.0, 378.0, 0, 756.0, 15876.0, 'UNPAID',
        'Shop 4-5, Shanti Commercial Complex, Andheri East, Mumbai', 'Deliver before 11 AM due to local market traffic', '2026-11-13 14:00:00')
    `, [ordNewId, ent1Id, ret1Id]);

    run(`
      INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
      VALUES (?, ?, 'prod-oil-sunflower', 12, 0, 1260, 5, 756, 15876)
    `, [crypto.randomUUID(), ordNewId]);

    // Order B: ACCEPTED order (Inventory reserved, Invoice generated, unpaid)
    const ordAcceptedId = 'ord-cur-acc-02';
    run(`
      INSERT INTO orders (
        id, order_number, enterprise_id, retailer_id, status, subtotal,
        cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
        payment_status, shipping_address, created_at, updated_at
      ) VALUES (?, 'ORD-2026-00302', ?, ?, 'ACCEPTED', 30200.0, 1782.0, 1782.0, 0, 3564.0, 33764.0, 'UNPAID',
        'Station Road, Near Teen Haath Naka, Thane', '2026-11-11 10:30:00', '2026-11-11 11:00:00')
    `, [ordAcceptedId, ent1Id, ret2Id]);

    run(`
      INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
      VALUES (?, ?, 'prod-surf-excel', 6, 0, 3380, 18, 3650.4, 23930.4)
    `, [crypto.randomUUID(), ordAcceptedId]);

    run(`
      INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
      VALUES (?, ?, 'prod-parle-g', 4, 0, 2450, 12, 1176.0, 10976.0)
    `, [crypto.randomUUID(), ordAcceptedId]);

    // Invoice for Order B (Issued & Overdue)
    const invBId = 'inv-cur-overdue-02';
    run(`
      INSERT INTO invoices (
        id, invoice_number, order_id, enterprise_id, retailer_id,
        subtotal, cgst_amount, sgst_amount, igst_amount, total_amount,
        paid_amount, balance_amount, due_date, status, created_at
      ) VALUES (?, 'INV-2026-00302', ?, ?, ?, 30200.0, 1782.0, 1782.0, 0, 33764.0, 0.0, 33764.0, '2026-11-05 00:00:00', 'OVERDUE', '2026-10-21 11:00:00')
    `, [invBId, ordAcceptedId, ent1Id, ret2Id]);

    // Payment Reminder sent for Invoice B
    run(`
      INSERT INTO payment_reminders (
        id, reminder_number, enterprise_id, retailer_id, invoice_id, amount_due, due_date,
        reminder_type, message, channel, schedule_type, delivery_status, delivery_provider_ref, sent_at
      ) VALUES (?, 'REM-2026-00001', ?, ?, ?, 33764.0, '2026-11-05', 'OVERDUE_PAYMENT',
        'URGENT: Dear Gupta Kirana, Invoice #INV-2026-00302 of ₹33,764 is now overdue. Kindly process payment to avoid dispatch holds.',
        'ALL', 'MANUAL', 'DELIVERED', 'WHATSAPP_CONFIRMED_MSGID_883492', '2026-11-08 09:30:00')
    `, [crypto.randomUUID(), ent1Id, ret2Id, invBId]);

    // Order C: PARTIALLY DISPATCHED Order (Demonstrates partial dispatch logic & remaining qty tracking)
    const ordPartId = 'ord-cur-part-03';
    run(`
      INSERT INTO orders (
        id, order_number, enterprise_id, retailer_id, status, subtotal,
        cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
        payment_status, shipping_address, created_at, updated_at
      ) VALUES (?, 'ORD-2026-00303', ?, ?, 'PARTIALLY_DISPATCHED', 25200.0, 630.0, 630.0, 0, 1260.0, 26460.0, 'PARTIALLY_PAID',
        'Shop 4-5, Shanti Commercial Complex, Andheri East, Mumbai', '2026-11-09 15:45:00', '2026-11-10 16:00:00')
    `, [ordPartId, ent1Id, ret1Id]);

    const orderItemPart1 = crypto.randomUUID();
    // 20 Ordered, 12 Dispatched, 8 Remaining
    run(`
      INSERT INTO order_items (id, order_id, product_id, quantity, dispatched_quantity, base_price, gst_rate, gst_amount, total_price)
      VALUES (?, ?, 'prod-oil-sunflower', 20, 12, 1260, 5, 1260.0, 26460.0)
    `, [orderItemPart1, ordPartId]);

    // Dispatch record for the 12 units
    const dspId = 'dsp-cur-001';
    run(`
      INSERT INTO dispatch_records (
        id, dispatch_number, order_id, enterprise_id, retailer_id, transporter_name,
        tracking_number, vehicle_number, driver_phone, waybill_number, dispatch_date, expected_delivery_date, status, notes
      ) VALUES (?, 'DSP-2026-00001', ?, ?, ?, 'GATI KWE Freight Logistics',
        'TRK-GATI-998822', 'MH-04-AZ-4512', '+91 97665 43210', 'LR-882201',
        '2026-11-10 16:00:00', '2026-11-12 18:00:00', 'IN_TRANSIT', 'Batch 1 of 2 dispatched (12 cartons out of 20)')
    `, [dspId, ordPartId, ent1Id, ret1Id]);

    run(`
      INSERT INTO dispatch_items (id, dispatch_id, order_item_id, product_id, quantity)
      VALUES (?, ?, ?, 'prod-oil-sunflower', 12)
    `, [crypto.randomUUID(), dspId, orderItemPart1]);

    // Invoice for Order C
    const invCId = 'inv-cur-part-03';
    run(`
      INSERT INTO invoices (
        id, invoice_number, order_id, enterprise_id, retailer_id,
        subtotal, cgst_amount, sgst_amount, igst_amount, total_amount,
        paid_amount, balance_amount, due_date, status, created_at
      ) VALUES (?, 'INV-2026-00303', ?, ?, ?, 25200.0, 630.0, 630.0, 0, 26460.0, 15000.0, 11460.0, '2026-11-24 00:00:00', 'PARTIALLY_PAID', '2026-11-09 16:00:00')
    `, [invCId, ordPartId, ent1Id, ret1Id]);

    // Partial Payment recorded for Invoice C
    const payCId = 'pay-cur-001';
    run(`
      INSERT INTO payments (
        id, payment_number, enterprise_id, retailer_id, amount, payment_method,
        transaction_reference, payment_date, receipt_number, created_at
      ) VALUES (?, 'PAY-2026-00301', ?, ?, 15000.0, 'UPI', 'UPI-REF-99238812', '2026-11-10 12:30:00', 'RCP-2026-00301', '2026-11-10 12:30:00')
    `, [payCId, ent1Id, ret1Id]);

    run(`
      INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount, created_at)
      VALUES (?, ?, ?, 15000.0, '2026-11-10 12:30:00')
    `, [crypto.randomUUID(), payCId, invCId]);

    // 7. RETAILER SELLING RECORDS (Realized vs Estimated Profit)
    // Krishna Supermarket sales tracking
    run(`
      INSERT INTO retailer_selling_records (
        id, retailer_id, product_id, purchased_qty, sold_qty, purchase_cost_per_unit,
        target_selling_price, actual_selling_price, realized_profit, is_itc_eligible
      ) VALUES (?, ?, 'prod-oil-sunflower', 110, 85, 1260.0, 1560.0, 1550.0, 24650.0, 1)
    `, [crypto.randomUUID(), ret1Id]);

    run(`
      INSERT INTO retailer_selling_records (
        id, retailer_id, product_id, purchased_qty, sold_qty, purchase_cost_per_unit,
        target_selling_price, actual_selling_price, realized_profit, is_itc_eligible
      ) VALUES (?, ?, 'prod-rice-basmati', 55, 40, 2350.0, 2850.0, 2850.0, 20000.0, 1)
    `, [crypto.randomUUID(), ret1Id]);

    // 8. NOTIFICATIONS FOR BOTH USERS
    run(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, 'New Order #ORD-2026-00301 Received', 'Retailer Krishna Supermarket placed an order for ₹15,876.', 'ORDER', '/enterprise/orders?id=ord-cur-new-01', 0, '2026-11-13 14:05:00')
    `, [crypto.randomUUID(), ent1UserId]);

    run(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, 'Overdue Payment Reminder: Invoice #INV-2026-00302', 'Reminder from Apex National Distributing for ₹33,764 overdue.', 'REMINDER', '/retailer/financials?invoice=inv-cur-overdue-02', 0, '2026-11-08 09:30:00')
    `, [crypto.randomUUID(), ret2UserId]);

    run(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, 'Partial Dispatch In Transit: DSP-2026-00001', '12 Cartons of Sunflower Oil dispatched via GATI KWE (Tracking: TRK-GATI-998822)', 'DISPATCH', '/retailer/orders?id=ord-cur-part-03', 0, '2026-11-10 16:15:00')
    `, [crypto.randomUUID(), ret1UserId]);

    console.log('✅ Seed completed successfully with realistic multi-month business data!');
  });

  db.exec('PRAGMA foreign_keys = ON;');
};

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/db/seed.js')) {
  seedDatabase()
    .then(() => {
      console.log('🚀 Ready to start server.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Seed error:', err);
      process.exit(1);
    });
}

