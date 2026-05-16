import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  // After stripping the leading #, at most 3 words separated by spaces or hyphens
  @Matches(/^#?[\wÀ-ž]+([-\s][\wÀ-ž]+){0,2}$/i, {
    message: 'Un tag ne peut pas dépasser 3 mots',
  })
  name: string;
}