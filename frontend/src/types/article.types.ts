// // types/article.types.ts

// export enum ArticleStatus {
//   DRAFT = 'DRAFT',
//   PENDING = 'PENDING',
//   PUBLISHED = 'PUBLISHED',
//   REJECTED = 'REJECTED',
// }

// export interface User {
//   id: number;
//   email: string;
//   firstName: string;
//   lastName: string;
//   role: UserRole;
//   department?: string;
// }

// export enum UserRole {
//   ADMIN = 'ADMIN',
//   EMPLOYEE = 'EMPLOYEE',
//   MODERATOR = 'MODERATOR',
// }

// export interface Category {
//   id: number;
//   name: string;
//   description?: string;
//   icon?: string;
// }

// export interface Tag {
//   id: number;
//   name: string;
// }

// export interface Media {
//   id: number;
//   url: string;
//   filename: string;
//   mimetype: string;
//   size: number;
//   type: MediaType;
//   articleId: number;
//   createdAt: string;
// }

// export enum MediaType {
//   IMAGE = 'IMAGE',
//   VIDEO = 'VIDEO',
//   DOCUMENT = 'DOCUMENT',
//   OTHER = 'OTHER',
// }

// export interface Article {
//   id: number;
//   title: string;
//   content: string;
//   status: ArticleStatus;
//   author: User;
//   category: Category;
//   tags: Tag[];
//   media: Media[];
//   views: number;
//   likes: number;
//   createdAt: string;
//   updatedAt: string;
//   publishedAt?: string;
// }

// export interface CreateArticleDto {
//   title: string;
//   content: string;
//   categoryId: number;
//   tagIds: number[];
//   media?: MediaDto[];
//   status?: ArticleStatus;
// }

// export interface MediaDto {
//   url: string;
//   filename: string;
//   mimetype: string;
//   size: number;
// }

// export interface UpdateArticleDto extends Partial<CreateArticleDto> {
//   id: number;
// }

// export interface ArticleFilters {
//   status?: ArticleStatus;
//   categoryId?: number;
//   tagIds?: number[];
//   authorId?: number;
//   search?: string;
//   page?: number;
//   limit?: number;
//   sortBy?: 'createdAt' | 'updatedAt' | 'views' | 'likes';
//   sortOrder?: 'ASC' | 'DESC';
// }

// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   page: number;
//   limit: number;
//   totalPages: number;
// }