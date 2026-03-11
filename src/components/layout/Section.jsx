import React from 'react';

// Section — groups related content with consistent spacing
export default function Section({ title, subtitle, children, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {title && (
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-600 mt-1">{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}