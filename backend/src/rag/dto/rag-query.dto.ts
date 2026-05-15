import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class RagQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  limit?: number = 4;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.25;
}