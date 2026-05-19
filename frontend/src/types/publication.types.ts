// // types/publication.types.ts

// export enum PublicationStatus {
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
//   publicationId: number;
//   createdAt: string;
// }

// export enum MediaType {
//   IMAGE = 'IMAGE',
//   VIDEO = 'VIDEO',
//   DOCUMENT = 'DOCUMENT',
//   OTHER = 'OTHER',
// }

// export interface Publication {
//   id: number;
//   title: string;
//   content: string;
//   status: PublicationStatus;
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

// export interface CreatePublicationDto {
//   title: string;
//   content: string;
//   categoryId: number;
//   tagIds: number[];
//   media?: MediaDto[];
//   status?: PublicationStatus;
// }

// export interface MediaDto {
//   url: string;
//   filename: string;
//   mimetype: string;
//   size: number;
// }

// export interface UpdatePublicationDto extends Partial<CreatePublicationDto> {
//   id: number;
// }

// export interface PublicationFilters {
//   status?: PublicationStatus;
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