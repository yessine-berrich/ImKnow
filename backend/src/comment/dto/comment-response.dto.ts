// src/comments/dto/comment-response.dto.ts
export class CommentAuthorDto {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string | null;
}

export class CommentResponseDto {
  id: number;
  content: string;
  likes: number;
  isEdited?: boolean;
  isLiked?: boolean;
  author: CommentAuthorDto;
  parentId?: number;
  createdAt: string;
  replies?: CommentResponseDto[];
}