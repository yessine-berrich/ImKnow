import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleAuthDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  profileImage?: string;

  @IsString()
  @IsNotEmpty()
  googleId: string;

  /** Forwarded by the controller from the request headers — never sent by the client. */
  @IsString()
  @IsOptional()
  userAgent?: string;

  /** Forwarded by the controller from the request IP — never sent by the client. */
  @IsString()
  @IsOptional()
  ipAddress?: string;
}