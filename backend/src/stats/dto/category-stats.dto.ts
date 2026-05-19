export class CategoryStatDto {
  id: number;
  name: string;
  description?: string;
  publicationCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementScore: number;
}

export class CategoryStatsResponseDto {
  categories: CategoryStatDto[];
  totalPublications: number;
  mostPopularCategory: CategoryStatDto | null;
}
