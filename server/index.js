import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import './db/connection.js'; // Ensure DB initialized
import { queryOne } from './db/connection.js';
import { seedDatabase } from './db/seed.js';

// Auto-seed if database is freshly created or empty
try {
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    console.log('⚡ Empty database detected. Running seed script...');
    await seedDatabase();
    console.log('✅ Auto-seed completed successfully.');
  }
} catch (e) {
  console.warn('Auto-seed check notice:', e.message);
}

// Route imports
import authRoutes from './routes/auth.js';
import notificationRoutes from './routes/notifications.js';

// Enterprise routes
import enterpriseDashboardRoutes from './routes/enterprise/dashboard.js';
import enterpriseProductRoutes from './routes/enterprise/products.js';
import enterpriseInventoryRoutes from './routes/enterprise/inventory.js';
import enterpriseOrderRoutes from './routes/enterprise/orders.js';
import enterpriseDispatchRoutes from './routes/enterprise/dispatches.js';
import enterpriseRetailerRoutes from './routes/enterprise/retailers.js';
import enterpriseReminderRoutes from './routes/enterprise/reminders.js';
import enterprisePaymentRoutes from './routes/enterprise/payments.js';
import enterpriseForecastingRoutes from './routes/enterprise/forecasting.js';
import enterpriseAnalyticsRoutes from './routes/enterprise/analytics.js';

// Retailer routes
import retailerDashboardRoutes from './routes/retailer/dashboard.js';
import retailerMarketplaceRoutes from './routes/retailer/marketplace.js';
import retailerCalculatorRoutes from './routes/retailer/calculator.js';
import retailerCartRoutes from './routes/retailer/cart.js';
import retailerOrderRoutes from './routes/retailer/orders.js';
import retailerFinancialRoutes from './routes/retailer/financials.js';
import retailerIntelligenceRoutes from './routes/retailer/intelligence.js';
import retailerProfitRoutes from './routes/retailer/profit.js';
import retailerNotificationRoutes from './routes/retailer/notifications.js';
import retailerProfileRoutes from './routes/retailer/profile.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📡 [${req.method}] ${req.url} from ${req.ip}`);
  res.on('finish', () => {
    console.log(`🏁 [${req.method}] ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'VyaparX Full-Stack Platform API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Common Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);

// Enterprise Portal API Routes (strictly guarded by requireEnterprise)
app.use('/api/enterprise/dashboard', enterpriseDashboardRoutes);
app.use('/api/enterprise/products', enterpriseProductRoutes);
app.use('/api/enterprise/inventory', enterpriseInventoryRoutes);
app.use('/api/enterprise/orders', enterpriseOrderRoutes);
app.use('/api/enterprise/dispatches', enterpriseDispatchRoutes);
app.use('/api/enterprise/retailers', enterpriseRetailerRoutes);
app.use('/api/enterprise/reminders', enterpriseReminderRoutes);
app.use('/api/enterprise/payments', enterprisePaymentRoutes);
app.use('/api/enterprise/forecasting', enterpriseForecastingRoutes);
app.use('/api/enterprise/analytics', enterpriseAnalyticsRoutes);

// Retailer Portal API Routes (strictly guarded by requireRetailer)
app.use('/api/retailer/dashboard', retailerDashboardRoutes);
app.use('/api/retailer/marketplace', retailerMarketplaceRoutes);
app.use('/api/retailer/calculator', retailerCalculatorRoutes);
app.use('/api/retailer/cart', retailerCartRoutes);
app.use('/api/retailer/orders', retailerOrderRoutes);
app.use('/api/retailer/financials', retailerFinancialRoutes);
app.use('/api/retailer/intelligence', retailerIntelligenceRoutes);
app.use('/api/retailer/profit', retailerProfitRoutes);
app.use('/api/retailer/notifications', retailerNotificationRoutes);
app.use('/api/retailer/profile', retailerProfileRoutes);

// Serve Frontend in Production if build exists
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.',
  });
});

const PORT = config.port;
const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('server/index.js');
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 VyaparX Backend Server running on http://localhost:${PORT}`);
    console.log(`📦 Enterprise & Retailer APIs active with strict RBAC.`);
    console.log(`=======================================================`);
  });
}

export default app;

