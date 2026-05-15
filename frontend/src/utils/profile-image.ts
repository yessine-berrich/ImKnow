/**
 * Single source of truth for resolving a stored profileImage path to a
 * fully-qualified URL that can be dropped directly into an <img src>.
 *
 * Rules:
 *  - null / empty            → '' (caller renders a fallback/initials)
 *  - absolute URL (http/https) → returned as-is (legacy Google URL fallback)
 *  - /uploads/...            → prefixed with the API origin
 *  - other /... paths        → returned as-is (Next.js public assets)
 */

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

export function resolveAvatarUrl(profileImage?: string | null): string {
  if (!profileImage?.trim()) return '/images/profile.jpg';

  const v = profileImage.trim();

  if (v.startsWith('http://') || v.startsWith('https://')) return v;

  if (v.startsWith('/uploads/')) return `${API_ORIGIN}${v}`;

  if (v.startsWith('/')) return v; // Next.js /public asset

  return `${API_ORIGIN}/${v}`;
}

/**
 * @deprecated Use resolveAvatarUrl() instead.
 * Kept temporarily to avoid breaking other imports during migration.
 */
export const resolveProfileImageSrc = resolveAvatarUrl;

export const DEFAULT_AVATAR_SRC = '/images/profile.jpg';
