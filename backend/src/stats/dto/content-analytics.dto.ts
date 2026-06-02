export class DailyPublicationDto {
  date: string;
  published: number;
  draft: number;
  rejected: number;
}

export class ContentAnalyticsResponseDto {
  dailyPublications: DailyPublicationDto[];
  period: {
    from: string;
    to: string;
  };
  totalPublished: number;
  totalDraft: number;
  totalRejected: number;
  publicationRate: number;
  avgTimeToPublish: number | null;
}
