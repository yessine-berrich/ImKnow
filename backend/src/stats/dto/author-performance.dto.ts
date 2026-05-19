export class AuthorPerformanceDto {
  userId: number;
  fullName: string;
  initials: string;
  department?: string;
  totalPublications: number;
  publishedPublications: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViewsPerPublication: number;
  engagementRate: number;
  topPerformingPublication: {
    id: number;
    title: string;
    views: number;
  } | null;
}

export class AuthorPerformanceResponseDto {
  authors: AuthorPerformanceDto[];
  totalAuthors: number;
  topAuthor: AuthorPerformanceDto | null;
  avgPublicationsPerAuthor: number;
}
