import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';

export default function FreemiumBanner({ type, message }) {
  const bgColor = type === 'limit_reached' ? 'bg-yellow-50' : 'bg-slate-50';
  const borderColor = type === 'limit_reached' ? 'border-yellow-200' : 'border-slate-200';
  const textColor = type === 'limit_reached' ? 'text-yellow-700' : 'text-slate-700';
  const iconColor = type === 'limit_reached' ? 'text-yellow-600' : 'text-slate-600';

  return (
    <div className={`${bgColor} rounded p-3 border ${borderColor} flex gap-2`}>
      {type === 'limit_reached' ? (
        <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
      ) : (
        <Lock className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconColor}`} />
      )}
      <p className={`text-xs ${textColor}`}>{message}</p>
    </div>
  );
}