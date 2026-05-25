import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class RagQueryDto {
  @IsString()
  q: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 12;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number = 0.25;

  @IsOptional()
  @IsNumber()
  conversationId?: number;
}