// components/chat/UserAvatar.tsx
//
// Displays a user avatar in chat views.
// Uses resolveAvatarUrl() directly — no hook, no blob, no fetch.
import React, { useState, useEffect, useMemo } from 'react';
import { resolveAvatarUrl } from '@/utils/profile-image';

interface UserAvatarProps {
  profileImageUrl?: string | null;
  fullName: string;
  initials: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  profileImageUrl,
  fullName,
  initials,
  size = 40,
  showOnline = false,
  isOnline = false,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Pure URL resolution — no network request
  const src = useMemo(() => resolveAvatarUrl(profileImageUrl), [profileImageUrl]);

  // Reset error when the URL changes (e.g. after avatar update)
  useEffect(() => {
    setImgError(false);
  }, [src]);

  const label = fullName || initials || '?';
  const letters =
    label !== '?'
      ? label
          .trim()
          .split(/\s+/)
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

  const fontSize = Math.max(10, Math.round(size * 0.35));
  const dotSize = Math.max(8, Math.round(size * 0.26));

  return (
    <div
      className={`flex-shrink-0 relative ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      <div className="absolute inset-0 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold shadow-md">
        {src && !imgError ? (
          <img
            src={src}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span style={{ fontSize, lineHeight: 1 }}>{letters}</span>
        )}
      </div>

      {showOnline && (
        <div
          className={`absolute rounded-full border-2 border-white z-10 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
          style={{ width: dotSize, height: dotSize, bottom: 1, right: 1 }}
        />
      )}
    </div>
  );
};

export default UserAvatar;
