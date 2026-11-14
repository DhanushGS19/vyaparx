import express from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, run, transaction } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise, logAudit } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// Get all categories
router.get('/categories', (req, res) => {
  try {
    const categories = queryAll(`SELECT * FROM product_categories ORDER BY name ASC`);
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// List enterprise products with search & filters
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { categoryId, status, search, visibility } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      WHERE p.enterprise_id = ?
    `;
    const params = [enterpriseId];

    if (categoryId) {
      query += ` AND p.category_id = ?`;
      params.push(categoryId);
    }
    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    }
    if (visibility !== undefined && visibility !== '') {
      query += ` AND p.is_visible = ?`;
      params.push(Number(visibility));
    }
    if (search && search.trim()) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.hsn_code LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY p.created_at DESC`;
    const products = queryAll(query, params);

    return res.json({ success: true, count: products.length, products });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Get single product
router.get('/:id', (req, res) => {
  try {
    const product = queryOne(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN product_categories c ON p.category_id = c.id
      WHERE p.id = ? AND p.enterprise_id = ?
    `, [req.params.id, req.enterpriseId]);

    if (!product) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });
    return res.json({ success: true, product });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Create product
router.post('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const {
      categoryId,
      name,
      sku,
      barcode,
      description,
      imageUrl,
      uom = 'Pieces',
      basePrice,
      gstRate = 18,
      hsnCode,
      wholesalePrice,
      suggestedRetailPrice,
      moq = 1,
      bulkPricing,
      stockAvailable = 0,
      status = 'ACTIVE',
      isVisible = 1,
    } = req.body;

    if (!categoryId || !name || !sku || !basePrice || !hsnCode) {
      return res.status(400).json({ error: 'Validation Error', message: 'Category, Name, SKU, Base Price, and HSN Code are required.' });
    }

    // Check SKU unique per enterprise
    const existingSku = queryOne(`SELECT id FROM products WHERE enterprise_id = ? AND sku = ?`, [enterpriseId, sku.trim()]);
    if (existingSku) {
      return res.status(400).json({ error: 'Conflict', message: `A product with SKU "${sku}" already exists.` });
    }

    const DEFAULT_CATEGORY_IMAGES = {
      'cat-fmcg': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
      'cat-personal': 'https://images.unsplash.com/photo-1559591937-e109d949ecb7?w=500&auto=format&fit=crop&q=80',
      'cat-home': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
      'cat-dairy': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500&auto=format&fit=crop&q=80',
      'cat-staples': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    };
    const finalImageUrl = imageUrl || DEFAULT_CATEGORY_IMAGES[categoryId] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';

    const productId = crypto.randomUUID();
    const numericBasePrice = Number(basePrice);
    const numericWholesalePrice = wholesalePrice ? Number(wholesalePrice) : numericBasePrice;
    const numericSuggestedPrice = suggestedRetailPrice ? Number(suggestedRetailPrice) : Math.round(numericWholesalePrice * 1.25);
    const bulkJson = bulkPricing ? (typeof bulkPricing === 'string' ? bulkPricing : JSON.stringify(bulkPricing)) : null;

    transaction(() => {
      run(`
        INSERT INTO products (
          id, enterprise_id, category_id, name, sku, barcode, description, image_url,
          uom, base_price, gst_rate, hsn_code, wholesale_price, suggested_retail_price,
          moq, bulk_pricing_json, stock_available, status, is_visible
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        productId,
        enterpriseId,
        categoryId,
        name.trim(),
        sku.trim(),
        barcode ? barcode.trim() : null,
        description ? description.trim() : null,
        finalImageUrl,
        uom,
        numericBasePrice,
        Number(gstRate),
        hsnCode.trim(),
        numericWholesalePrice,
        numericSuggestedPrice,
        Number(moq) || 1,
        bulkJson,
        Number(stockAvailable) || 0,
        status,
        Number(isVisible) ? 1 : 0
      ]);

      if (Number(stockAvailable) > 0) {
        // Record initial inventory inward
        run(`
          INSERT INTO inventory_transactions (
            id, enterprise_id, product_id, transaction_type, quantity, previous_stock, new_stock, notes
          ) VALUES (?, ?, ?, 'PURCHASE_INWARD', ?, 0, ?, 'Initial inventory inward')
        `, [crypto.randomUUID(), enterpriseId, productId, Number(stockAvailable), Number(stockAvailable)]);
      }

      logAudit(req.user.id, 'CREATE_PRODUCT', 'PRODUCT', productId, { name, sku, basePrice }, enterpriseId);
    });

    const newProduct = queryOne(`SELECT * FROM products WHERE id = ?`, [productId]);
    return res.status(201).json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Update product
router.put('/:id', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const productId = req.params.id;

    const existing = queryOne(`SELECT * FROM products WHERE id = ? AND enterprise_id = ?`, [productId, enterpriseId]);
    if (!existing) return res.status(404).json({ error: 'Not Found', message: 'Product not found.' });

    const {
      categoryId,
      name,
      sku,
      barcode,
      description,
      imageUrl,
      uom,
      basePrice,
      gstRate,
      hsnCode,
      wholesalePrice,
      suggestedRetailPrice,
      moq,
      bulkPricing,
      stockAvailable,
      status,
      isVisible,
    } = req.body;

    const bulkJson = bulkPricing !== undefined ? (typeof bulkPricing === 'string' ? bulkPricing : JSON.stringify(bulkPricing)) : existing.bulk_pricing_json;

    run(`
      UPDATE products
      SET category_id = COALESCE(?, category_id),
          name = COALESCE(?, name),
          sku = COALESCE(?, sku),
          barcode = COALESCE(?, barcode),
          description = COALESCE(?, description),
          image_url = COALESCE(?, image_url),
          uom = COALESCE(?, uom),
          base_price = COALESCE(?, base_price),
          gst_rate = COALESCE(?, gst_rate),
          hsn_code = COALESCE(?, hsn_code),
          wholesale_price = COALESCE(?, wholesale_price),
          suggested_retail_price = COALESCE(?, suggested_retail_price),
          moq = COALESCE(?, moq),
          bulk_pricing_json = ?,
          stock_available = COALESCE(?, stock_available),
          status = COALESCE(?, status),
          is_visible = COALESCE(?, is_visible),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND enterprise_id = ?
    `, [
      categoryId || null,
      name || null,
      sku || null,
      barcode || null,
      description || null,
      imageUrl || null,
      uom || null,
      basePrice !== undefined ? Number(basePrice) : null,
      gstRate !== undefined ? Number(gstRate) : null,
      hsnCode || null,
      wholesalePrice !== undefined ? Number(wholesalePrice) : null,
      suggestedRetailPrice !== undefined ? Number(suggestedRetailPrice) : null,
      moq !== undefined ? Number(moq) : null,
      bulkJson,
      stockAvailable !== undefined ? Number(stockAvailable) : null,
      status || null,
      isVisible !== undefined ? Number(isVisible) : null,
      productId,
      enterpriseId
    ]);

    logAudit(req.user.id, 'UPDATE_PRODUCT', 'PRODUCT', productId, req.body, enterpriseId);

    const updated = queryOne(`SELECT * FROM products WHERE id = ?`, [productId]);
    return res.json({ success: true, product: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Toggle visibility
router.patch('/:id/visibility', (req, res) => {
  try {
    const { isVisible } = req.body;
    run(`UPDATE products SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND enterprise_id = ?`, [
      Number(isVisible) ? 1 : 0,
      req.params.id,
      req.enterpriseId
    ]);
    return res.json({ success: true, isVisible: Number(isVisible) ? 1 : 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Delete or archive product
router.delete('/:id', (req, res) => {
  try {
    run(`UPDATE products SET status = 'INACTIVE', is_visible = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND enterprise_id = ?`, [
      req.params.id,
      req.enterpriseId
    ]);
    logAudit(req.user.id, 'ARCHIVE_PRODUCT', 'PRODUCT', req.params.id, {}, req.enterpriseId);
    return res.json({ success: true, message: 'Product archived successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

