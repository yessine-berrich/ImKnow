export class ModerationStatusDto {
  status: string;
  count: number;
  percentage: number;
}

export class ModerationCategoryDto {
  category: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
}

export class DailyModerationDto {
  date: string;
  approved: number;
  rejected: number;
  pending: number;
  flagged: number;
}

export class ModerationStatsResponseDto {
  totalModerated: number;
  statusBreakdown: ModerationStatusDto[];
  flaggedCategories: ModerationCategoryDto[];
  dailyTrend: DailyModerationDto[];
  avgModerationTime: number | null;
  rejectionRate: number;
  autoModerationRate: number;
}
