export class ReadingTimeRangeDto {
  range: string;
  min: number;
  max: number;
  publicationCount: number;
  avgEngagement: number;
}

export class PublicationReadingStatsDto {
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
  longestPublications: PublicationReadingStatsDto[];
  shortestPublications: PublicationReadingStatsDto[];
  optimalLength: {
    wordCount: number;
    engagement: number;
  } | null;
}
