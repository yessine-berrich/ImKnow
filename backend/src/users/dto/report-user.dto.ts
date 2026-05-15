import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const USER_REPORT_REASONS = [
  'harassment',
  'spam',
  'inappropriate_content',
  'impersonation',
  'other',
] as const;

export type UserReportReason = (typeof USER_REPORT_REASONS)[number];

export class ReportUserDto {
  @IsIn(USER_REPORT_REASONS)
  reason: UserReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
