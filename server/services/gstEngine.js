/**
 * VyaparX Configurable GST & Profit Calculation Engine
 * Complies with Indian Goods and Services Tax (GST) Act
 * Supports Intra-state (CGST + SGST) and Inter-state (IGST)
 * Supports Input Tax Credit (ITC) eligibility logic
 * Accurately differentiates between Profit Margin and Markup
 */

export const calculateGST = ({
  basePrice,
  gstRate,
  supplierStateCode,
  retailerStateCode,
  quantity = 1,
  discountPercent = 0,
}) => {
  const numericBasePrice = Number(basePrice) || 0;
  const numericGstRate = Number(gstRate) || 0;
  const qty = Number(quantity) || 1;
  const discPct = Number(discountPercent) || 0;

  // Discounted subtotal
  const unitDiscount = (numericBasePrice * discPct) / 100;
  const discountedUnitPrice = numericBasePrice - unitDiscount;
  const totalSubtotal = discountedUnitPrice * qty;

  // Determine Intra-state vs Inter-state
  const isIntraState = supplierStateCode && retailerStateCode
    ? String(supplierStateCode).trim() === String(retailerStateCode).trim()
    : true; // Default to intra-state if unspecified

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isIntraState) {
    cgstRate = numericGstRate / 2;
    sgstRate = numericGstRate / 2;
    cgstAmount = Number(((totalSubtotal * cgstRate) / 100).toFixed(2));
    sgstAmount = Number(((totalSubtotal * sgstRate) / 100).toFixed(2));
  } else {
    igstRate = numericGstRate;
    igstAmount = Number(((totalSubtotal * igstRate) / 100).toFixed(2));
  }

  const totalGst = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
  const totalAmount = Number((totalSubtotal + totalGst).toFixed(2));
  const effectiveUnitPriceWithGst = Number((totalAmount / qty).toFixed(2));

  return {
    isIntraState,
    discountedUnitPrice: Number(discountedUnitPrice.toFixed(2)),
    subtotal: Number(totalSubtotal.toFixed(2)),
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    totalAmount,
    effectiveUnitPriceWithGst,
  };
};

/**
 * Calculates complete Retailer Profitability Breakdown
 * Distinct treatment for GST-registered (ITC eligible) vs Composition/Unregistered
 */
export const calculateRetailerProfitBreakdown = ({
  baseWholesalePrice,
  gstRate = 18,
  sellingPrice,
  isItcEligible = true,
  quantity = 1,
  supplierStateCode = '27',
  retailerStateCode = '27',
}) => {
  const basePrice = Number(baseWholesalePrice) || 0;
  const rate = Number(gstRate) || 0;
  const sPrice = Number(sellingPrice) || 0;
  const qty = Number(quantity) || 1;

  const gstCalc = calculateGST({
    basePrice,
    gstRate: rate,
    supplierStateCode,
    retailerStateCode,
    quantity: 1,
  });

  const grossPurchaseCostPerUnit = gstCalc.effectiveUnitPriceWithGst;
  const inputGstAmount = gstCalc.totalGst;

  let effectiveCostPerUnit = grossPurchaseCostPerUnit;
  let recoverableInputGst = 0;
  let nonRecoverableGst = 0;

  if (isItcEligible) {
    // If eligible for ITC, the input GST is credited back against output tax liability.
    // True economic cost to the business is the base price (excluding GST).
    effectiveCostPerUnit = basePrice;
    recoverableInputGst = inputGstAmount;
    nonRecoverableGst = 0;
  } else {
    // Composition or non-registered: Input GST cannot be claimed as credit; it becomes an expense.
    effectiveCostPerUnit = grossPurchaseCostPerUnit;
    recoverableInputGst = 0;
    nonRecoverableGst = inputGstAmount;
  }

  // Calculate profit metrics per unit
  const profitPerUnit = Number((sPrice - effectiveCostPerUnit).toFixed(2));
  
  // Profit Margin = (Profit / Selling Price) * 100
  const profitMarginPercent = sPrice > 0 
    ? Number(((profitPerUnit / sPrice) * 100).toFixed(2)) 
    : 0;

  // Markup = (Profit / Effective Cost) * 100
  const markupPercent = effectiveCostPerUnit > 0
    ? Number(((profitPerUnit / effectiveCostPerUnit) * 100).toFixed(2))
    : 0;

  // Output GST collected on sale (if selling price is exclusive of GST)
  const outputGstPerUnit = isItcEligible ? Number(((sPrice * rate) / 100).toFixed(2)) : 0;
  const netGstLiabilityPerUnit = isItcEligible 
    ? Number(Math.max(0, outputGstPerUnit - recoverableInputGst).toFixed(2))
    : 0;

  // Total for chosen quantity
  const totalPurchaseCost = Number((effectiveCostPerUnit * qty).toFixed(2));
  const totalGrossInvestment = Number((grossPurchaseCostPerUnit * qty).toFixed(2));
  const totalExpectedRevenue = Number((sPrice * qty).toFixed(2));
  const totalExpectedProfit = Number((profitPerUnit * qty).toFixed(2));

  return {
    baseWholesalePrice: basePrice,
    gstRate: rate,
    inputGstAmount,
    grossPurchaseCostPerUnit,
    isItcEligible,
    effectiveCostPerUnit,
    recoverableInputGst,
    nonRecoverableGst,
    sellingPrice: sPrice,
    outputGstPerUnit,
    netGstLiabilityPerUnit,
    profitPerUnit,
    profitMarginPercent,
    markupPercent,
    quantity: qty,
    totalGrossInvestment,
    totalPurchaseCost,
    totalExpectedRevenue,
    totalExpectedProfit,
  };
};

/**
 * Suggests an intelligent selling price based on purchase cost and target margin
 */
export const suggestSellingPrice = ({
  baseWholesalePrice,
  gstRate = 18,
  isItcEligible = true,
  targetMarginPercent = 18,
  previousSellingPrice = null,
}) => {
  const basePrice = Number(baseWholesalePrice) || 0;
  const rate = Number(gstRate) || 0;
  const targetMargin = Math.min(Math.max(Number(targetMarginPercent) || 18, 1), 90);

  const effectiveCost = isItcEligible ? basePrice : basePrice * (1 + rate / 100);

  // Selling Price formula for given margin: S = Cost / (1 - Margin/100)
  const calculatedSuggestion = Number((effectiveCost / (1 - targetMargin / 100)).toFixed(2));

  // If retailer has a previous selling price for this product, take a weighted average
  let suggested = calculatedSuggestion;
  if (previousSellingPrice && previousSellingPrice > effectiveCost) {
    suggested = Number(((calculatedSuggestion * 0.7) + (previousSellingPrice * 0.3)).toFixed(2));
  }

  // Round to nearest integer or convenient 5/10 for retail friendliness
  const roundedSuggested = Math.round(suggested);

  const breakdown = calculateRetailerProfitBreakdown({
    baseWholesalePrice: basePrice,
    gstRate: rate,
    sellingPrice: roundedSuggested,
    isItcEligible,
    quantity: 1,
  });

  return {
    suggestedPrice: roundedSuggested,
    rawCalculated: calculatedSuggestion,
    targetMarginPercent: targetMargin,
    breakdown,
  };
};

export default {
  calculateGST,
  calculateRetailerProfitBreakdown,
  suggestSellingPrice,
};

