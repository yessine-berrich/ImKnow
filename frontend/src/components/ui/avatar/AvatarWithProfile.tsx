// components/ui/avatar/AvatarWithProfile.tsx
//
// Thin wrapper kept for backward-compatibility.
// Previously fetched a blob URL on every render — that logic has been removed.
// Now simply passes profileImageUrl (already a local /uploads/... path) to Avatar,
// which resolves it to a full URL via resolveAvatarUrl(). No fetch, no blob.
'use client';

import Avatar, { type AvatarProps } from './Avatar';

interface AvatarWithProfileProps extends Omit<AvatarProps, 'src'> {
  userId?: number | string;
  profileImageUrl?: string | null;
}

export default function AvatarWithProfile({
  userId: _userId, // kept in props signature for API compatibility, not used
  profileImageUrl,
  ...rest
}: AvatarWithProfileProps) {
  return <Avatar src={profileImageUrl} {...rest} />;
}
