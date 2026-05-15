export class MonthlyUserActivityDto {
  month: string;
  newUsers: number;
  activeUsers: number;
  articlesPublished: number;
  commentsMade: number;
}

export class UserActivityResponseDto {
  currentMonth: MonthlyUserActivityDto;
  previousMonth: MonthlyUserActivityDto;
  growthRate: {
    newUsers: number;
    activeUsers: number;
    articlesPublished: number;
  };
  history: MonthlyUserActivityDto[];
}
