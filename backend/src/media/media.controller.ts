// backend/src/media/media.controller.ts

import { Controller, Post, UseInterceptors, UploadedFiles, UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '../users/guards/auth.guard';
import { MediaType } from './entities/media.entity';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-rar-compressed',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
};

@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-multiple')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async uploadMultipleFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    
    const uploadedFiles = await Promise.all(files.map(async (file) => {
      const mediaType = this.mediaService.getMediaTypeFromMimeType(file.mimetype);
      const fileUrl = `${APP_URL}/uploads/${file.filename}`;
      
      const savedMedia = await this.mediaService.create({
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        type: mediaType, // mediaType est déjà du type MediaType
        size: file.size,
      });

      return {
        id: savedMedia.id,
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        type: mediaType,
        size: file.size,
      };
    }));
    
    return uploadedFiles;
  }
}