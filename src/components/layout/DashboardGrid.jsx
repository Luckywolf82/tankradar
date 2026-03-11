import React from 'react';

// DashboardGrid — responsive grid layout for dashboard cards
export default function DashboardGrid({ children, columns = 1, className = '' }) {
  const colsClass = {
    1: 'grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
  }[columns] || 'grid-cols-1';

  return (
    <div className={`grid ${colsClass} gap-4 ${className}`}>
      {children}
    </div>
  );
}