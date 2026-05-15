import { IsString, MinLength } from 'class-validator';

export class CheckDuplicateDto {
  @IsString()
  @MinLength(10)
  title: string;

  @IsString()
  @MinLength(20)
  content: string;
}