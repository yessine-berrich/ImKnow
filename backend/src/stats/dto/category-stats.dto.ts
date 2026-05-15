export class CategoryStatDto {
  id: number;
  name: string;
  description?: string;
  articleCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementScore: number;
}

export class CategoryStatsResponseDto {
  categories: CategoryStatDto[];
  totalArticles: number;
  mostPopularCategory: CategoryStatDto | null;
}
