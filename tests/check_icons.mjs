import fs from 'fs';
import path from 'path';

function checkDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkDirectory(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      checkFile(fullPath);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Find lucide-react imports
  const lucideMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  if (!lucideMatch) return;

  const importedIcons = new Set(
    lucideMatch[1]
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => s.split(' as ')[0].trim())
  );

  // Find all JSX tags that look like Lucide icons (PascalCase)
  const tagMatches = content.matchAll(/<([A-Z][A-Za-z0-9]+)\b/g);
  const commonComponents = new Set([
    'Modal', 'StatCard', 'StatusBadge', 'BrandLogo', 'NotificationBell',
    'DashboardView', 'ProductsView', 'InventoryView', 'OrdersView', 'DemandForecastView',
    'DispatchesView', 'Retailers360View', 'AnalyticsView', 'RetailerHomeView', 'MarketplaceView',
    'ProfitCalculatorView', 'CartCheckoutView', 'MyOrdersView', 'FinancialsView',
    'PurchaseIntelligenceView', 'RetailerProfileView', 'ProfitDashboardView', 'ProductOrderCard',
    'React', 'Fragment'
  ]);

  for (const match of tagMatches) {
    const tagName = match[1];
    if (commonComponents.has(tagName)) continue;
    // Check if it's imported or defined in file
    if (!importedIcons.has(tagName) && !content.includes(`const ${tagName}`) && !content.includes(`function ${tagName}`) && !content.includes(`import ${tagName}`)) {
      console.log(`[MISSING IMPORT] In ${filePath}: <${tagName} /> is used but not imported!`);
    }
  }
}

checkDirectory('src');
console.log('Check finished.');

