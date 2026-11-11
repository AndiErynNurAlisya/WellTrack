import React from 'react';
import { Activity } from 'lucide-react';

export default function BrandLogo({ size = 'md', showTagline = false }) {
  const iconBox =
    size === 'lg' ? 'h-11 w-11 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-9 w-9 rounded-xl';
  const textClass =
    size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-lg' : 'text-xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <div
        className={`${iconBox} bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-sm shrink-0`}
      >
        <Activity className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className={`${textClass} font-extrabold tracking-tight text-brand-600 leading-none`}>
          Well<span className="text-surface-ink">Track</span>
        </span>
        {showTagline && (
          <span className="text-[11px] font-medium text-surface-hint mt-0.5">
            Personal Health & Habit Tracker
          </span>
        )}
      </div>
    </div>
  );
}

