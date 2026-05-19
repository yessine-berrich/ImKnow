// src/stats/dto/trending-publication.dto.ts

/**
 * Score de tendance (100 pts max) :
 *
 *   views        → 40 pts  (portée brute)
 *   likes        → 35 pts  (engagement actif)
 *   comments     → 25 pts  (engagement conversationnel)
 *
 * Chaque dimension est normalisée par rapport au max du lot.
 */

export class TrendingPublicationAuthorDto {
  name: string;
  initials: string;
  department?: string;
}

export class TrendingPublicationCategoryDto {
  name: string;
//   slug: string;
}

export class TrendingPublicationDto {
  id: number;
  title: string;
  description: string;
  content: string;
  category: TrendingPublicationCategoryDto;
  author: TrendingPublicationAuthorDto;
  tags: string[];
  publishedAt: string;
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
  trendScore: number; // score composite 0–100
  rank: number;
}

export class TrendingPublicationsResponseDto {
  period: { from: string; to: string };
  publications: TrendingPublicationDto[];
}