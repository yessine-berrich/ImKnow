import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { userRole } from 'utils/constants';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  // Ce champ est rempli par le contrôleur après l'upload
  @IsOptional()
  @IsString()
  profileImage?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  removeProfileImage?: boolean;

  // Champs Réseaux Sociaux (si vous les avez ajoutés à l'entité)
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsString()
  linkedin?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsEnum(userRole)
  role?: userRole;
}