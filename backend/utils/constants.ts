export enum userRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserStatus {
  ACTIVE  = 'actif',
  INACTIVE = 'inactif',
  PENDING  = 'pending',
}

export enum PublicationStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

export enum NotificationType {
  MENTION = 'mention',
  REPLY = 'reply',
  NEW_COMMENT = 'new_comment',
  SYSTEM_ERROR = 'system_error',
  PUBLICATION_PUBLISHED = 'publication_published',
  PUBLICATION_PENDING_MODERATION = 'publication_pending_moderation',
  PUBLICATION_REJECTED = 'publication_rejected',
  SYSTEM_INFO = 'system_info',
  COMMENT_LIKED = 'comment_liked',
  PUBLICATION_LIKED = 'publication_liked',
  PUBLICATION_BOOKMARKED = 'publication_bookmarked',
  USER_ROLE_CHANGED = 'user_role_changed',
  NEW_FOLLOWER = 'new_follower',
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
}

export enum FollowStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}