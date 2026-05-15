// backend/src/media/media.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media, MediaType } from './entities/media.entity';
import { CreateMediaDto } from './dto/create-media.dto';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
  ) {}

  async create(createMediaDto: CreateMediaDto): Promise<Media> {
    // Valider l'URL
    if (!createMediaDto.url || (!createMediaDto.url.startsWith('http') && !createMediaDto.url.startsWith('/uploads/'))) {
      throw new Error('URL de média invalide');
    }
    
    const media = this.mediaRepository.create(createMediaDto);
    return this.mediaRepository.save(media);
  }

  getMediaTypeFromMimeType(mimetype: string): MediaType {
    if (mimetype.startsWith('image/')) return MediaType.IMAGE;
    if (mimetype.startsWith('video/')) return MediaType.VIDEO;
    if (mimetype.startsWith('audio/')) return MediaType.AUDIO;
    if (mimetype === 'application/pdf') return MediaType.DOCUMENT;
    if (mimetype === 'text/plain') return MediaType.DOCUMENT;
    if (mimetype.includes('word') || mimetype.includes('document')) return MediaType.DOCUMENT;
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return MediaType.DOCUMENT;
    return MediaType.OTHER;
  }
}