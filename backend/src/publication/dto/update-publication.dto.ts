// src/publication/dto/update-publication.dto.ts
import { IsString, IsOptional, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateMediaDto } from '../../media/dto/create-media.dto';
import { PublicationStatus } from 'utils/constants';

export class UpdatePublicationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(PublicationStatus)
  @IsOptional()
  status?: PublicationStatus;

  @Transform(({ value }) => value ? Number(value) : undefined)
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((item) => Number(item));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  tagIds?: number[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMediaDto)
  media?: CreateMediaDto[];

  @IsString()
  @IsOptional()
  changeSummary?: string;
}