export class ReadingTimeRangeDto {
  range: string;
  min: number;
  max: number;
  articleCount: number;
  avgEngagement: number;
}

export class ArticleReadingStatsDto {
  id: number;
  title: string;
  author: string;
  wordCount: number;
  estimatedReadTime: number;
  actualAvgTime: number | null;
  completionRate: number | null;
  views: number;
}

export class ReadingTimeResponseDto {
  ranges: ReadingTimeRangeDto[];
  avgWordCount: number;
  avgReadTime: number;
  longestArticles: ArticleReadingStatsDto[];
  shortestArticles: ArticleReadingStatsDto[];
  optimalLength: {
    wordCount: number;
    engagement: number;
  } | null;
}
