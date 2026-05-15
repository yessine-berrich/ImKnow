// utils/chat.utils.ts

/**
 * Returns the display name for a user object.
 * Prefers fullName, falls back to "firstName lastName", then "User".
 */
export function getFullName(user?: {
  fullName?: string;
  firstName?: string;
  lastName?: string;
} | null): string {
  if (!user) return 'User';
  if (user.fullName?.trim()) return user.fullName.trim();
  const composed = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return composed || 'User';
}

/**
 * Returns two-letter initials for a user, e.g. "JD" for "John Doe".
 */
export function getInitials(user?: {
  firstName?: string;
  lastName?: string;
} | null): string {
  if (!user) return 'U';
  const first = user.firstName?.[0]?.toUpperCase() ?? '';
  const last = user.lastName?.[0]?.toUpperCase() ?? '';
  return `${first}${last}` || 'U';
}

/**
 * Generates a stable conversation ID from two user IDs (always sorted ascending).
 */
export function generateConversationId(userId1: number, userId2: number): string {
  const [a, b] = [userId1, userId2].sort((x, y) => x - y);
  return `${a}_${b}`;
}

/**
 * Formats a file size in bytes into a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Returns true when the MIME type is an image.
 */
export function isImageMime(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}