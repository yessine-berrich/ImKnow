// components/ui/avatar/Avatar.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { resolveAvatarUrl } from '@/utils/profile-image';

export interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  status?: 'online' | 'offline' | 'away' | 'busy' | null;
  isOnline?: boolean;
  lastSeenAt?: Date | string | null;
  className?: string;
  onClick?: () => void;
}

const SIZE_CLASSES = {
  small: 'w-8 h-8',
  medium: 'w-12 h-12',
  large: 'w-16 h-16',
  xlarge: 'w-24 h-24',
  xxlarge: 'w-32 h-32',
} as const;

const STATUS_COLORS = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500',
  busy: 'bg-red-500',
} as const;

const STATUS_DOT_SIZES = {
  small: 'w-2 h-2',
  medium: 'w-3 h-3',
  large: 'w-4 h-4',
  xlarge: 'w-5 h-5',
  xxlarge: 'w-6 h-6',
} as const;

const TEXT_SIZES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  xlarge: 'text-xl',
  xxlarge: 'text-2xl',
} as const;

export default function Avatar({
  src,
  alt,
  size = 'medium',
  status = null,
  isOnline,
  lastSeenAt,
  className = '',
  onClick,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  // resolveAvatarUrl: converts a stored path (/uploads/avatars/...) to a full URL.
  // No fetch, no blob, no async — pure string transformation.
  const resolvedSrc = useMemo(() => resolveAvatarUrl(src), [src]);

  // Reset error state whenever the source changes so the new image gets a
  // fresh attempt even if the previous one failed.
  useEffect(() => {
    setImgError(false);
  }, [resolvedSrc]);

  const determinedStatus = useMemo(() => {
    if (status) return status;
    if (isOnline === true) return 'online';
    if (isOnline === false) return 'offline';
    if (lastSeenAt) {
      const diffMin = (Date.now() - new Date(lastSeenAt).getTime()) / 60_000;
      if (diffMin < 1) return 'online';
      if (diffMin < 60) return 'away';
      if (diffMin < 240) return 'busy';
      return 'offline';
    }
    return null;
  }, [status, isOnline, lastSeenAt]);

  const initials = useMemo(() => {
    if (!alt) return '?';
    return alt
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [alt]);

  return (
    <div
      className={`relative inline-block ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div
        className={`${SIZE_CLASSES[size]} rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-md ${className}`}
      >
        {resolvedSrc && !imgError ? (
          <img
            src={resolvedSrc}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={TEXT_SIZES[size]}>{initials}</span>
        )}
      </div>

      {determinedStatus && (
        <div
          className={`absolute bottom-0 right-0 ${STATUS_DOT_SIZES[size]} ${STATUS_COLORS[determinedStatus]} rounded-full border-2 border-white dark:border-gray-900`}
        />
      )}
    </div>
  );
}
