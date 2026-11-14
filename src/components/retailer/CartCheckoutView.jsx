import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Building2,
  Truck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Package,
  Receipt,
  RefreshCw,
  TrendingUp,
  Sparkles,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';
import Modal from '../common/Modal';

export const CartCheckoutView = ({ cartItems, onUpdateQuantity, onRemoveItem, onClearCart, onNavigate }) => {
  const [validatedCart, setValidatedCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const validateCartItems = async () => {
    if (!cartItems || cartItems.length === 0) {
      setValidatedCart(null);
      return;
    }
    setLoading(true);
    try {
      const itemsPayload = cartItems.map(i => ({ productId: i.id || i.productId, quantity: i.quantity }));
      const res = await api.retailer.validateCart(itemsPayload);
      setValidatedCart(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateCartItems();
  }, [cartItems]);

  const handleCheckout = async () => {
    if (!cartItems || !cartItems.length) return;
    setCheckoutLoading(true);
    try {
      const res = await api.retailer.checkoutCart({
        items: cartItems.map(i => ({ productId: i.id || i.productId, quantity: i.quantity })),
        shippingAddress: shippingAddress || undefined,
        deliveryInstructions,
      });

      onClearCart();
      setOrderConfirmation(res);
      setIsSuccessModalOpen(true);
    } catch (err) {
      alert(err.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // 1. Order Placed Confirmation Screen
  if (orderConfirmation) {
    return (
      <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-xl mx-auto space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Order Submitted to Distributors
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2">Wholesale Order Successfully Placed!</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your purchase orders have been submitted to supplier systems. Inventory is reserved and being prepared for shipment.
          </p>
        </div>

        <div className="space-y-2.5 text-left text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
            Orders Created ({orderConfirmation.orders?.length || 0}):
          </p>
          {orderConfirmation.orders?.map(o => (
            <div key={o.orderId} className="flex justify-between items-center py-2 border-b border-slate-200/60 last:border-b-0">
              <div>
                <span className="font-bold text-slate-900 font-mono text-sm">{o.orderNumber}</span>
                <span className="text-[11px] text-slate-500 block">{o.supplierName} • {o.itemCount} item(s)</span>
              </div>
              <span className="font-bold text-emerald-700 text-sm">₹{o.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => {
              setOrderConfirmation(null);
              onNavigate('orders');
            }}
            className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span>Track Delivery in My Orders</span>
          </button>
          <button
            onClick={() => {
              setOrderConfirmation(null);
              onNavigate('marketplace');
            }}
            className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Order More Products</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Empty Cart Screen
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="bg-white p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-lg mx-auto space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingCart className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your Wholesale Cart is Empty</h2>
          <p className="text-xs text-slate-500 mt-1">Browse verified supplier products in the marketplace and add wholesale batches to your order.</p>
        </div>
        <button
          onClick={() => onNavigate('marketplace')}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <span>Explore Wholesale Market</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. Loading Cart Validation
  if (loading && (!validatedCart || !validatedCart.suppliers?.length)) {
    return (
      <div className="bg-white p-16 rounded-3xl border border-slate-200/80 shadow-sm text-center max-w-lg mx-auto space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
        <h2 className="text-sm font-bold text-slate-900">Validating Wholesale Order...</h2>
        <p className="text-xs text-slate-500">Checking inventory reservation and applicable GST rates</p>
      </div>
    );
  }

  const suppliers = validatedCart?.suppliers || [];
  const summary = validatedCart?.summary || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wholesale Shopping Cart & Checkout</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-supplier separation automatically splits orders per enterprise for streamlined dispatch and invoicing
          </p>
        </div>

        <button
          onClick={onClearCart}
          className="text-xs text-rose-600 hover:text-rose-700 font-semibold self-start sm:self-auto"
        >
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Supplier-Wise Grouped Items */}
        <div className="lg:col-span-8 space-y-5">
          {suppliers.map((grp) => (
            <div key={grp.supplierId} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Supplier Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{grp.supplierName}</h3>
                    <span className="text-[10px] text-slate-500">{grp.supplierCity}, {grp.supplierState}</span>
                  </div>
                </div>

                <span className="text-xs font-bold text-slate-900">
                  Subtotal: ₹{grp.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Items in this Supplier Batch */}
              <div className="divide-y divide-slate-100">
                {grp.items.map((item) => (
                  <div key={item.productId} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                        <img
                          src={item.imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'}
                          alt={item.name}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku} • {item.uom}</p>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          ₹{item.unitPrice} + {item.gstRate}% GST
                        </p>

                        {/* Embedded Retail Resale & Single Product Profit Guidance */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="bg-emerald-50 text-emerald-950 font-extrabold px-2 py-0.5 rounded border border-emerald-300">
                            Sell 1 {item.innerUnitLabel || 'Piece'} at: ₹{(item.singleProductSuggestedPrice || (item.suggestedRetailPrice / (item.unitsPerWholesalePack || 1))).toFixed(2)}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            +₹{(item.singleProductProfit || (item.unitProfit / (item.unitsPerWholesalePack || 1))).toFixed(2)} profit / {item.innerUnitLabel?.toLowerCase() || 'piece'} ({item.singleProductMarginPct || item.profitMarginPercent}%)
                          </span>
                          <span className="text-slate-600 font-medium">
                            Batch Net Profit ({item.quantity} wholesale units): <strong className="text-emerald-800 font-black">+₹{item.itemTotalProfit?.toLocaleString('en-IN')}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 flex-shrink-0">
                      {/* Quantity Controls */}
                      <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.productId, Math.max(item.moq || 1, item.quantity - 1))}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total Price */}
                      <div className="text-right w-24">
                        <p className="font-bold text-xs text-slate-900">₹{item.itemTotal?.toLocaleString('en-IN')}</p>
                        <span className="text-[10px] text-slate-400">GST: ₹{item.itemGst}</span>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => onRemoveItem(item.productId)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Checkout Summary & Delivery Instructions */}
        <div className="lg:col-span-4 space-y-4">
          {/* 🌟 PROJECTED RETAIL PROFIT & RESALE VALUE (USER HIGHLIGHT) */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Projected Retail Profit</span>
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                +{summary.overallProfitMargin || 0}% Margin
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Total Wholesale Cost:</span>
                <span className="font-semibold text-white">₹{summary.total?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected Retail Resale:</span>
                <span className="font-semibold text-white">₹{summary.totalExpectedRevenue?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                <span className="font-bold text-white">Your Net Profit:</span>
                <span className="font-extrabold text-emerald-400 text-base">
                  +₹{summary.totalExpectedProfit?.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-emerald-300/90 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>By retailing this order, you pocket an estimated ₹{summary.totalExpectedProfit?.toLocaleString('en-IN')} net margin.</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
              Consolidated Order Summary
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Distributor Orders:</span>
                <span className="font-bold text-slate-900">{summary.supplierCount} Separate Purchase Orders</span>
              </div>
              <div className="flex justify-between">
                <span>Net Taxable Base:</span>
                <span className="font-semibold text-slate-800">₹{summary.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST Amount:</span>
                <span className="font-semibold text-slate-800">₹{summary.gst?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-emerald-700 text-base">₹{summary.total?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Delivery Instructions */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Special Delivery Instructions</label>
              <textarea
                rows={2}
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                placeholder="e.g. Call store owner before delivery. Store open 9 AM to 9 PM."
              />
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <span>{checkoutLoading ? 'Submitting Orders...' : 'Confirm Wholesale Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enterprise Fulfillment Guarantee</span>
              </p>
              <p>Inventory is reserved immediately upon supplier acceptance. Tax invoices will be issued under your shop's GSTIN.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {orderConfirmation && (
        <Modal
          isOpen={isSuccessModalOpen}
          onClose={() => {
            setIsSuccessModalOpen(false);
            onNavigate('orders');
          }}
          title="Orders Successfully Placed!"
          subtitle="Your wholesale purchase orders have been submitted directly to suppliers"
          maxWidth="max-w-md"
          footer={
            <button
              onClick={() => {
                setIsSuccessModalOpen(false);
                onNavigate('orders');
              }}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              Go to My Orders & Track Delivery
            </button>
          }
        >
          <div className="space-y-3 text-center py-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              VyaparX created <span className="font-bold text-slate-900">{orderConfirmation.orders?.length} distinct supplier orders</span>:
            </p>

            <div className="space-y-2 text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              {orderConfirmation.orders?.map(o => (
                <div key={o.orderId} className="flex justify-between items-center py-1">
                  <div>
                    <span className="font-bold text-slate-900 font-mono">{o.orderNumber}</span>
                    <span className="text-[10px] text-slate-500 block">{o.supplierName}</span>
                  </div>
                  <span className="font-bold text-emerald-700">₹{o.totalAmount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CartCheckoutView;

