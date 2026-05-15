// // types/article-card.ts

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

// export interface ArticleStats {
//   likes: number;
//   comments: number;
//   views: number;
// }

// export type ArticleStatus = 'draft' | 'published' | 'archived' | 'in_review';

// export interface Article {
//   id: string;
//   title: string;
//   description: string;
//   author: Author;
//   category: Category;
//   tags: string[];
//   isFeatured?: boolean;
//   publishedAt: string;
//   status: ArticleStatus;
//   stats: ArticleStats;
//   isLiked?: boolean;
//   isBookmarked?: boolean;
// }

// export interface ArticleCardProps {
//   article: Article;
//   onLike?: (id: string) => void;
//   onBookmark?: (id: string) => void;
//   onShare?: (id: string) => void;
//   onEdit?: (id: string) => void;
//   onDelete?: (id: string) => void;
//   showActions?: boolean;
// }

// // API Response types
// export interface LikeArticleResponse {
//   success: boolean;
//   likes: number;
//   isLiked: boolean;
// }

// export interface BookmarkArticleResponse {
//   success: boolean;
//   isBookmarked: boolean;
// }

// export interface DeleteArticleResponse {
//   success: boolean;
//   message: string;
// }