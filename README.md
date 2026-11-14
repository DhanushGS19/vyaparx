# VyaparX (व्यापारX) 🚀
### Intelligent B2B Supply Chain, Wholesale Distribution & Retailer Business Management Platform

VyaparX is a modern, scalable full-stack B2B commerce platform built to seamlessly connect wholesale distributors and large enterprises directly with small kirana stores and independent retailers across India.

---

## 🌟 Key Highlights & System Architecture

- **Single Codebase & Domain**: One application, one domain, one Express backend (`port 5000`), and one shared relational database (`data/vyaparx.db`).
- **Two Strictly Independent Portals**:
  1. **Enterprise Portal**: Wholesale catalog management, inventory control, warehouse stock, multi-batch dispatch tracking, retailer 360° accounts, payment reminder automation, payment reconciliation, and AI demand forecasting.
  2. **Retailer Portal**: B2B marketplace discovery, dynamic GST pricing, Smart Profit & Markup Calculator (with Input Tax Credit simulation), multi-supplier cart separation, order tracking, financial ledger, and real-time realized profit logging.
- **Strict Role Isolation**: An enterprise user can **never** access the retailer portal, and a retailer user can **never** access the enterprise portal. Enforced through cryptographic JWT tokens, backend RBAC middleware (`requireEnterprise` / `requireRetailer`), and frontend route guards.
- **Native Relational Storage**: Zero-dependency SQLite integration using Node 24 native `node:sqlite` (`DatabaseSync`), enabled with WAL mode and foreign key integrity.

---

## 🔑 Demo Login Credentials

For quick evaluation, click the **"Quick Demo Login"** buttons on the welcome page, or use the credentials below:

| Portal | Role | Email | Password | Business Name / Profile |
| :--- | :--- | :--- | :--- | :--- |
| **Enterprise** | Wholesale Distributor | `enterprise@apex.com` | `password123` | Apex National Distributing Ltd (Mumbai) |
| **Enterprise** | Agro Manufacturer | `enterprise@bharat.com` | `password123` | Bharat Agro Commodities (Pune) |
| **Retailer** | Regular GST Dealer | `retailer@krishna.com` | `password123` | Krishna Supermarket (Dadar, Mumbai) |
| **Retailer** | Composition Dealer | `retailer@gupta.com` | `password123` | Gupta Kirana Store (Kurla, Mumbai) |
| **Retailer** | Unregistered Kirana | `retailer@mahalaxmi.com` | `password123` | Mahalaxmi Provision Mart (Pune) |

---

## 📦 Core Modules

### 🏢 Enterprise Portal
1. **Executive Dashboard**: Live revenue growth, order volume, pending orders, outstanding balance, available stock, and dynamic date filtering (Today, 7D, 30D, 90D).
2. **Wholesale Product Catalog**: SKU, HSN code, GST tax slabs (5%, 12%, 18%), tiered bulk discounts, minimum order quantities (MOQ), and catalog visibility toggle.
3. **Inventory Control & Oversell Shield**: Multi-warehouse stock tracking, stock reservations upon order acceptance, automatic deduction upon dispatch, damage adjustments, and low-stock alerts.
4. **Order Management**: Order review lifecycle (`NEW` ➔ `ACCEPTED` ➔ `PROCESSING` ➔ `PARTIALLY_DISPATCHED` ➔ `DISPATCHED` ➔ `DELIVERED`). Automatic GST tax invoice generation.
5. **AI Demand Intelligence**: Multi-month statistical demand forecasting (linear trend + Holt-Winters) strictly using historical order records with 95% confidence intervals and safety stock recommendations. Insufficient-data guard avoids fabricated figures.
6. **Multi-Batch Dispatch Tracking**: Partial shipments, transporter details, vehicle number, waybill (LR), and tracking ID. Strictly blocks over-dispatching beyond ordered quantity.
7. **Retailer 360° Account Management**: Retailer profile, assigned credit limits, complete order history, financial ledger, and activity audit timeline.
8. **Payment Reminders & Reconciliation**: Dedicated **"Send Reminder"** system with customizable reminder types (Upcoming, Due, Overdue, Final Notice) and simulated WhatsApp/Email/In-App delivery. Matches incoming payments with invoices, prevents duplicate transaction references (UTR), and generates official receipts.

### 🏪 Retailer Portal
1. **Retailer Home & Insights**: Credit utilization, pending deliveries, outstanding dues, quick re-order recommendations, and supplier updates.
2. **Wholesale Marketplace**: Explore supplier catalogs with real-time GST pricing, MOQ badges, stock status, and tiered volume discount indicators.
3. **Live Resale Pricing & Profit Engine (Embedded in Every Item)**:
   - Eliminates need for a separate calculator tool: directly displays **Recommended Retail Resale Price (Sell at ₹X)** and **Shopkeeper Profit per Unit (+₹Y/unit • XX% Margin)** right on every product ordering card.
   - **Real-Time Interactive Order Calculator**: As the retailer adjusts quantities (+ / - / input), it computes:
     - Total Wholesale Order Cost
     - Expected Retail Sales Revenue
     - **Projected Net Shopkeeper Profit (with % Margin)**
   - Models **Input Tax Credit (ITC)**: Regular GST dealers see cost calculated after input tax credit; composition/unregistered dealers see full gross cost.
   - Quick "Tweak Resale Price" tool directly on the card allows instant simulation.
4. **Expanded Daily Essentials Catalog**: Pre-stocked with high-demand FMCG essentials:
   - 🪥 **Toothbrushes & Oral Care**: Colgate ZigZag Card of 12, Oral-B Shiny Clean Pack of 24, Colgate Strong Teeth Tubes.
   - 🧼 **Bathing Soaps**: Dettol Original, Lifebuoy Total 10, Dove White Beauty, Lux French Rose.
   - 🛢️ **Cooking & Hair Oils**: Fortune Sunlite Sunflower Oil, SunPure Sunflower Oil, Dhara Kachi Ghani Mustard Oil, Parachute Pure Coconut Oil, Dabur Amla Hair Oil.
   - 🧺 **Detergents & Cleaners**: Surf Excel Quick Wash, Rin Advanced Detergent Bar, Vim Lemon Dishwash Bar.
   - 🌾 **Staples & Grains**: Tata Salt, Kohinoor Basmati Rice, Aashirvaad Chakki Atta, Tata Tea Gold, Parle-G, Latur Toor Dal, A2 Cow Ghee.
5. **Cart & Multi-Supplier Separation**: Order splitting automatically separates items by supplier into distinct purchase orders upon single-click checkout, showing item-level and consolidated order profit projections.
5. **Order Tracking**: Detailed visual progress timeline from placement to acceptance, dispatch, and delivery.
6. **Financial Ledger & Receipts**: Invoices, balance dues, payment history, downloadable receipts, and payment reminder acknowledgment.
7. **Purchase Intelligence**: Monthly spend breakdown, category analysis, best-value products, and AI re-order forecasts.
8. **Realized Profit Tracker**: Tracks actual sales vs estimated inventory profit to differentiate held stock from cash in hand.

---

## 🛠️ Tech Stack

- **Backend**: Node.js 24, Express, `node:sqlite` (`DatabaseSync`), JWT (`jsonwebtoken`), `bcryptjs`, CORS.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts.
- **Data Engine**: Custom GST & ITC Engine, Time-Series Statistical Demand Forecaster, Inventory Reservation & Allocation Engine.

---

## 🚀 Running the Project

### 1. Install Dependencies
```bash
cmd.exe /c npm install
```

### 2. Seed Database (Optional - Pre-seeded with 5 months of historical data)
```bash
node server/db/seed.js
```

### 3. Build Frontend
```bash
cmd.exe /c npm run build
```

### 4. Start Full-Stack Server
```bash
node server/index.js
```
The application will be live at:
👉 **`http://localhost:5000`**

### 5. Run Verification Test Suite
To verify all 18 end-to-end specifications (security isolation, order flow, inventory reservation, partial dispatch, reminder system, payment reconciliation, and forecasting):
```bash
node tests/in_process_test.js
```

---

## 🛡️ Security & RBAC Enforcement

- Strict route guards return `HTTP 403 Forbidden` if an enterprise user attempts to call retailer endpoints or vice versa.
- No portal-switching functionality exists.
- Password hashing via bcrypt.
- Central audit logging records every order modification, dispatch, and payment reconciliation.

