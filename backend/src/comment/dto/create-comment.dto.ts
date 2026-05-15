import { IsString, IsNumber, IsArray, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNumber()
  articleId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @IsOptional()
  @IsNumber()
  parentId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  mentionedUserIds?: number[];
}