export class TagPerformanceDto {
  id: number;
  name: string;
  publicationCount: number;
  totalViews: number;
  totalLikes: number;
  avgEngagement: number;
  trending: boolean;
  growthRate: number;
}

export class TagStatsResponseDto {
  tags: TagPerformanceDto[];
  totalTags: number;
  topTrending: TagPerformanceDto[];
  mostUsed: TagPerformanceDto[];
  unusedTags: number;
}
