// backend/src/media/dto/create-media.dto.ts

import { IsString, IsNotEmpty, IsUrl, IsEnum, IsOptional, IsInt, IsNumber } from 'class-validator';
import { MediaType } from '../entities/media.entity';

export class CreateMediaDto {
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsEnum(MediaType)
  @IsOptional()
  type?: MediaType;

  @IsInt()
  @IsOptional()
  publicationId?: number;

  @IsNumber()
  @IsOptional()
  size?: number;
}