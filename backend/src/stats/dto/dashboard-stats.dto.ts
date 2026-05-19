export class DashboardStatsDto {
  totalPublications: number;
  totalUsers: number;
  totalCategories: number;
  totalTags: number;
  totalComments: number;
  totalLikes: number;
  publicationsThisWeek: number;
  publicationsThisMonth: number;
  newUsersThisMonth: number;
  mostActiveCategory: {
    id: number;
    name: string;
    publicationCount: number;
  } | null;
  topContributor: {
    userId: number;
    fullName: string;
    publicationsCount: number;
  } | null;
}
