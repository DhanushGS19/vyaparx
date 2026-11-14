import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-xl',
  footer,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto overscroll-contain flex items-center justify-center p-2 sm:p-4 text-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Card: Strictly height-constrained with internal scrolling so footers/buttons are NEVER clipped or off-screen */}
      <div
        className={`relative z-10 w-full ${maxWidth} my-auto flex flex-col min-h-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left animate-fade-in`}
        style={{
          maxHeight: 'min(90vh, 740px)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 border-b border-slate-100 bg-slate-50/95 sticky top-0 z-10">
          <div className="pr-2 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors flex-shrink-0 cursor-pointer"
            title="Close dialog (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body - Fully scrollable internally; never causes the dialog or buttons to overflow */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4">
          {children}
        </div>

        {/* Footer - Anchored to bottom, always visible, unclipped and accessible */}
        {footer && (
          <div className="flex-shrink-0 px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
