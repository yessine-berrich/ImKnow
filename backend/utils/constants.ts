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

export enum ArticleStatus {
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
  ARTICLE_PUBLISHED = 'article_published',
  ARTICLE_PENDING_MODERATION = 'article_pending_moderation',
  ARTICLE_REJECTED = 'article_rejected',
  SYSTEM_INFO = 'system_info',
  COMMENT_LIKED = 'comment_liked',
  ARTICLE_LIKED = 'article_liked',
  ARTICLE_BOOKMARKED = 'article_bookmarked',
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