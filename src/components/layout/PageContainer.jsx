import React from 'react';

// PageContainer — consistent max-width and padding for all pages
export default function PageContainer({ children, className = '' }) {
  return (
    <div className={`max-w-2xl mx-auto px-4 md:px-6 ${className}`}>
      {children}
    </div>
  );
}