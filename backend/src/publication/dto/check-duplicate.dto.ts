import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CheckDuplicateDto {
  @IsString()
  @MinLength(10)
  title: string;

  @IsString()
  @MinLength(20)
  content: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagNames?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaFilenames?: string[];
}