export class ContentQualityMetricDto {
  metric: string;
  value: number;
  benchmark: number;
  status: 'good' | 'average' | 'poor';
}

export class PublicationQualityDto {
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
  topQualityPublications: PublicationQualityDto[];
  needsImprovement: PublicationQualityDto[];
  avgWordCount: number;
  publicationsWithImages: number;
  publicationsWithTags: number;
}
