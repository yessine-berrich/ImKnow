export class MostLikedArticleDto {
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

export class MostBookmarkedArticleDto {
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
  mostLikedArticles: MostLikedArticleDto[];
  mostBookmarkedArticles: MostBookmarkedArticleDto[];
  totalLikes: number;
  totalBookmarks: number;
  avgLikesPerArticle: number;
  avgBookmarksPerArticle: number;
}
