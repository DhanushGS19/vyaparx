import React from 'react';

export const BrandLogo = ({ size = 'md', portal = null, light = false }) => {
  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-12 w-12 text-base',
  }[size] || 'h-9 w-9 text-sm';

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }[size] || 'text-xl';

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Original Geometric Commerce & Connectivity Symbol */}
      <div className={`${sizeClasses} relative rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-emerald-500 p-[1.5px] shadow-sm shadow-blue-500/20 flex items-center justify-center`}>
        <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 13 L20 27 L30 13 M20 27 L20 33 M14 20 L26 20" stroke="url(#logo-grad)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="logo-grad" x1="10" y1="13" x2="30" y2="33" gradientUnits="userSpaceOnUse">
                <stop stopColor="#38bdf8"/>
                <stop offset="1" stopColor="#34d399"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight ${textClasses} ${light ? 'text-white' : 'text-slate-900'}`}>
            Vyapar<span className="text-blue-600">X</span>
          </span>
          {portal && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              portal === 'ENTERPRISE'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {portal}
            </span>
          )}
        </div>
        <span className={`text-[9px] tracking-wider font-semibold uppercase -mt-0.5 ${light ? 'text-slate-400' : 'text-slate-500'}`}>
          B2B Supply Chain Network
        </span>
      </div>
    </div>
  );
};

export default BrandLogo;

