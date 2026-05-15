export class DashboardStatsDto {
  totalArticles: number;
  totalUsers: number;
  totalCategories: number;
  totalTags: number;
  totalComments: number;
  totalLikes: number;
  articlesThisWeek: number;
  articlesThisMonth: number;
  newUsersThisMonth: number;
  mostActiveCategory: {
    id: number;
    name: string;
    articleCount: number;
  } | null;
  topContributor: {
    userId: number;
    fullName: string;
    articlesCount: number;
  } | null;
}
