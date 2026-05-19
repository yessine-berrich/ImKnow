export class TopContributorDto {
  userId: number;
  fullName: string;
  initials: string;
  department?: string;
  profileImage?: string | null;
  publicationsCount: number;
  totalViews: number;
  totalLikes: number;
  score: number;
  rank: number;
}

export class TopContributorsResponseDto {
  period: { from: string; to: string };
  contributors: TopContributorDto[];
}