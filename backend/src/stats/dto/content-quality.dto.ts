export class ContentQualityMetricDto {
  metric: string;
  value: number;
  benchmark: number;
  status: 'good' | 'average' | 'poor';
}

export class ArticleQualityDto {
  id: number;
  title: string;
  author: string;
  wordCount: number;
  readabilityScore: number;
  hasImages: boolean;
  hasTags: boolean;
  hasCategory: boolean;
  moderationScore: number;
  qualityScore: number;
}

export class ContentQualityResponseDto {
  overallScore: number;
  metrics: ContentQualityMetricDto[];
  topQualityArticles: ArticleQualityDto[];
  needsImprovement: ArticleQualityDto[];
  avgWordCount: number;
  articlesWithImages: number;
  articlesWithTags: number;
}
