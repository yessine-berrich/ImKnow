export class MostLikedPublicationDto {
  id: number;
  title: string;
  author: {
    id: number;
    fullName: string;
  };
  likesCount: number;
  viewsCount: number;
  category: string;
  publishedAt: string;
}

export class MostBookmarkedPublicationDto {
  id: number;
  title: string;
  author: {
    id: number;
    fullName: string;
  };
  bookmarksCount: number;
  viewsCount: number;
  category: string;
  publishedAt: string;
}

export class EngagementStatsResponseDto {
  mostLikedPublications: MostLikedPublicationDto[];
  mostBookmarkedPublications: MostBookmarkedPublicationDto[];
  totalLikes: number;
  totalBookmarks: number;
  avgLikesPerPublication: number;
  avgBookmarksPerPublication: number;
}
