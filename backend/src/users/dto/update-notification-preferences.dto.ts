import { IsBoolean, IsOptional } from "class-validator";
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;
}