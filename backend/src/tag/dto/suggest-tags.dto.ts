import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SuggestTagsDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;
}
