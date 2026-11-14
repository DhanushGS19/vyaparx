import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const config = {
    // Orders
    NEW: { label: 'New Order', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    ACCEPTED: { label: 'Accepted', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    PROCESSING: { label: 'Processing', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    PARTIALLY_DISPATCHED: { label: 'Partially Dispatched', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    DISPATCHED: { label: 'Dispatched', bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    IN_TRANSIT: { label: 'In Transit', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
    DELIVERED: { label: 'Delivered', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    CANCELLED: { label: 'Cancelled', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    REJECTED: { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' },

    // Invoices & Payments
    ISSUED: { label: 'Issued', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    UNPAID: { label: 'Unpaid', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    PARTIALLY_PAID: { label: 'Partially Paid', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    PAID: { label: 'Paid', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    OVERDUE: { label: 'Overdue', bg: 'bg-red-50 text-red-700 border-red-200 animate-pulse' },

    // Stock & Inventory
    ACTIVE: { label: 'Active', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    INACTIVE: { label: 'Inactive', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
    LOW_STOCK: { label: 'Low Stock', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    OUT_OF_STOCK: { label: 'Out of Stock', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    OPTIMAL: { label: 'Healthy', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  }[status] || { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {config.label}
    </span>
  );
};

export default StatusBadge;

