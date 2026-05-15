export class AuthorPerformanceDto {
  userId: number;
  fullName: string;
  initials: string;
  department?: string;
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgViewsPerArticle: number;
  engagementRate: number;
  topPerformingArticle: {
    id: number;
    title: string;
    views: number;
  } | null;
}

export class AuthorPerformanceResponseDto {
  authors: AuthorPerformanceDto[];
  totalAuthors: number;
  topAuthor: AuthorPerformanceDto | null;
  avgArticlesPerAuthor: number;
}
