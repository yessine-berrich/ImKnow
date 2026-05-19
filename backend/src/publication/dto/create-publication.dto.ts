import { IsString, IsNotEmpty, IsInt, IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateMediaDto } from '../../media/dto/create-media.dto'; // Importe le DTO du Media
import { PublicationStatus } from 'utils/constants';

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => sanitizeContent(value))
  content: string; // Le Markdown avec les URLs des images

  @Transform(({ value }) => Number(value))
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((item) => Number(item));
    }
    return value;
  })
  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  tagIds?: number[]; // IDs des tags existants

  @IsEnum(PublicationStatus)
  @IsOptional()
  status?: PublicationStatus;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto) // Important pour la validation des objets imbriqués
  media?: CreateMediaDto[]; 
}



/**
 * Strips any injected media references from the content field.
 * Media belongs in the `media` table only — never embedded in content.
 */
function sanitizeContent(raw: string): string {
  if (!raw || typeof raw !== 'string') return raw;

  return raw
    // Remove markdown image syntax: ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove markdown links pointing to upload paths: [text](/uploads/...)
    .replace(/\[.*?\]\(\/uploads\/.*?\)/g, '')
    // Remove raw /uploads/ URLs left as plain text
    .replace(/\/uploads\/\S+/g, '')
    // Remove data URIs (base64 embedded files)
    .replace(/data:[a-z]+\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g, '')
    .trim();
}