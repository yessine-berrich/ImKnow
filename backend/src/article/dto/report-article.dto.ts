import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const ARTICLE_REPORT_REASONS = [
  'misinformation',
  'spam',
  'inappropriate_content',
  'plagiarism',
  'hate_speech',
  'other',
] as const;

export type ArticleReportReason = (typeof ARTICLE_REPORT_REASONS)[number];

export class ReportArticleDto {
  @IsIn(ARTICLE_REPORT_REASONS)
  reason: ArticleReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
