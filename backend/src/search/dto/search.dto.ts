import { IsOptional, IsString, MinLength, IsInt, Min, Max, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDto {
  @IsString()
  @MinLength(1, { message: 'Search query must not be empty' })
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limitPerType?: number = 5;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.65;
}
