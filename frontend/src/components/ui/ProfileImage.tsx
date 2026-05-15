// components/ui/ProfileImage.tsx
//
// Backward-compatible wrapper. Previously fetched a blob URL — that logic has
// been removed. The stored profileImage path is resolved to a full URL by Avatar.
'use client';

import Avatar from './avatar/Avatar';

interface ProfileImageProps {
  profileImage?: string | null;
  alt: string;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
}

export default function ProfileImage({
  profileImage,
  alt,
  className = '',
  size = 'medium',
}: ProfileImageProps) {
  return <Avatar src={profileImage} alt={alt} className={className} size={size} />;
}
