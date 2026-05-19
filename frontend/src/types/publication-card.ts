// // types/publication-card.ts

// export interface Author {
//   name: string;
//   initials: string;
//   department: string;
//   avatar?: string;
// }

// export interface Category {
//   name: string;
//   slug: string;
// }

// export interface PublicationStats {
//   likes: number;
//   comments: number;
//   views: number;
// }

// export type PublicationStatus = 'draft' | 'published' | 'archived' | 'in_review';

// export interface Publication {
//   id: string;
//   title: string;
//   description: string;
//   author: Author;
//   category: Category;
//   tags: string[];
//   isFeatured?: boolean;
//   publishedAt: string;
//   status: PublicationStatus;
//   stats: PublicationStats;
//   isLiked?: boolean;
//   isBookmarked?: boolean;
// }

// export interface PublicationCardProps {
//   publication: Publication;
//   onLike?: (id: string) => void;
//   onBookmark?: (id: string) => void;
//   onShare?: (id: string) => void;
//   onEdit?: (id: string) => void;
//   onDelete?: (id: string) => void;
//   showActions?: boolean;
// }

// // API Response types
// export interface LikePublicationResponse {
//   success: boolean;
//   likes: number;
//   isLiked: boolean;
// }

// export interface BookmarkPublicationResponse {
//   success: boolean;
//   isBookmarked: boolean;
// }

// export interface DeletePublicationResponse {
//   success: boolean;
//   message: string;
// }