import React, { useState } from 'react';

export default function UserAvatar({ name = 'Pengguna', photoUrl = null, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);

  const initials = (name || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-20 w-20 text-2xl',
  }[size] || 'h-10 w-10 text-sm';

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        onError={() => setImgError(true)}
        className={`${sizeClasses} rounded-full object-cover border-2 border-brand-200 bg-surface-soft shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold flex items-center justify-center border-2 border-brand-200 shrink-0 select-none ${className}`}
      title={name}
    >
      {initials || 'U'}
    </div>
  );
}

