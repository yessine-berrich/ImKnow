import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PUBLICATION_REPORT_REASONS = [
  'misinformation',
  'spam',
  'inappropriate_content',
  'plagiarism',
  'hate_speech',
  'other',
] as const;

export type PublicationReportReason = (typeof PUBLICATION_REPORT_REASONS)[number];

export class ReportPublicationDto {
  @IsIn(PUBLICATION_REPORT_REASONS)
  reason: PublicationReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
