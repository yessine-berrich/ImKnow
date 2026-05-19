import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Req,
  Res,
  BadRequestException,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { PublicationService } from './publication.service';
import { PublicationInteractionService } from './publication-interaction.service';
import { MediaService } from '../media/media.service';
import { CreatePublicationDto } from './dto/create-publication.dto';
import { UpdatePublicationDto } from './dto/update-publication.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ReportPublicationDto } from './dto/report-publication.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Roles } from '../users/decorators/user-role.decorator';
import { CurrentPayload } from '../users/decorators/current-payload.decorator';
import { AuthGuard } from '../users/guards/auth.guard';
import { PublicationStatus, userRole } from 'utils/constants';
import type { JwtPayloadType } from 'utils/types';

// Allowed file types
const allowedMimeTypes = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  // Videos
  'video/mp4', 'video/webm', 'video/ogg',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg',
];

// Multer configuration for file uploads
export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException(`File type not allowed: ${file.mimetype}`), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
};


@Controller('api/publications')
export class PublicationController {
  constructor(
    private readonly publicationService: PublicationService,
    private readonly userService: UsersService,
    private readonly publicationInteractionService: PublicationInteractionService,
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
  ) { }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async create(
    @Body() createPublicationDto: CreatePublicationDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    // Process uploaded files and create media DTOs with correct type
    const mediaDtos = files?.map((file) => {
      const fileUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${file.filename}`;
      const mediaType = this.mediaService.getMediaTypeFromMimeType(file.mimetype);
      return {
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        type: mediaType, // mediaType est du type MediaType
      };
    }) || [];

    // Add media to DTO
    const publicationDtoWithMedia: CreatePublicationDto = {
      ...createPublicationDto,
      media: [...(createPublicationDto.media || []), ...mediaDtos],
    };

    return this.publicationService.create(publicationDtoWithMedia, {
      id: payload.sub,
    } as User);
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Req() request: Request) {
    let userId: number | undefined = undefined;

    try {
      const authHeader = request.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token);
        userId = payload.sub;
      }
    } catch (err) {
      // Token invalide ou expiré - on ignore
    }

    const publications = await this.publicationService.findAll();

    return publications.map(publication => {
      const isLiked = userId ? publication.likes?.some(like => like.id === userId) : false;
      const isBookmarked = userId ? publication.bookmarks?.some(bookmark => bookmark.id === userId) : false;

      return {
        id: publication.id,
        title: publication.title,
        content: publication.content,
        description: publication.content?.substring(0, 150) + '...' || '',
        status: publication.status,
        viewsCount: publication.viewsCount || 0,
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,

        author: publication.author ? {
          id: publication.author.id,
          name: `${publication.author.firstName || ''} ${publication.author.lastName || ''}`.trim() || 'User',
          initials: ((publication.author.firstName?.charAt(0) || '') + (publication.author.lastName?.charAt(0) || '')).toUpperCase() || 'U',
          department: publication.author.department || 'Member',
          avatar: publication.author.profileImage,
        } : null,

        category: publication.category ? {
          id: publication.category.id,
          name: publication.category.name,
          slug: publication.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
        } : null,

        tags: publication.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],

        media: publication.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],

        stats: {
          likes: publication.likes?.length || 0,
          comments: publication.comments?.length || 0,
          views: publication.viewsCount || 0,
        },

        isLiked: isLiked,
        isBookmarked: isBookmarked,
        isFeatured: (publication.viewsCount || 0) > 1000,
      };
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: Request,
  ) {
    let userId: number | undefined = undefined;

    try {
      const authHeader = request.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify(token);
        userId = payload.sub;
      }
    } catch (err) {
      // Token invalide ou expiré - on ignore
    }

    const publication = await this.publicationService.findOne(id);

    // Calculer isLiked et isBookmarked à partir des tableaux chargés
    const isLiked = userId ? publication.likes?.some(like => like.id === userId) : false;
    const isBookmarked = userId ? publication.bookmarks?.some(bookmark => bookmark.id === userId) : false;

    // Retourner l'publication formaté avec toutes les informations
    return {
      id: publication.id,
      title: publication.title,
      content: publication.content,
      description: publication.content?.substring(0, 150) + '...' || '',
      status: publication.status,
      viewsCount: publication.viewsCount || 0,
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt,

      author: publication.author ? {
        id: publication.author.id,
        name: `${publication.author.firstName || ''} ${publication.author.lastName || ''}`.trim() || 'User',
        initials: ((publication.author.firstName?.charAt(0) || '') + (publication.author.lastName?.charAt(0) || '')).toUpperCase() || 'U',
        department: publication.author.role || 'Member',
        avatar: publication.author.profileImage,
      } : null,
      category: publication.category ? {
        id: publication.category.id,
        name: publication.category.name,
        slug: publication.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
      } : null,
      tags: publication.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],
      stats: {
        likes: publication.likes?.length || 0,
        comments: publication.comments?.length || 0,
        views: publication.viewsCount || 0,
      },
      isLiked,
      isBookmarked,
      isFeatured: (publication.viewsCount || 0) > 1000,
      likes: publication.likes,
      bookmarks: publication.bookmarks,
      comments: publication.comments,
      media: publication.media?.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimetype: m.mimetype,
        type: m.type,
        size: m.size,
      })) || [],
    };
  }

  @Get(':id/media')
  @UseGuards(AuthGuard)
  async getPublicationMedia(@Param('id', ParseIntPipe) id: number) {
    const media = await this.publicationService.getPublicationMedia(id);
    return {
      success: true,
      count: media.length,
      media: media.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimetype: m.mimetype,
        type: m.type,
        size: m.size,
      })),
    };
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePublicationDto: UpdatePublicationDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    // Process uploaded files and create media DTOs with correct type
    const mediaDtos = files?.map((file) => {
      const fileUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/${file.filename}`;
      const mediaType = this.mediaService.getMediaTypeFromMimeType(file.mimetype);
      return {
        url: fileUrl,
        filename: file.originalname,
        mimetype: file.mimetype,
        type: mediaType, // mediaType est du type MediaType
      };
    }) || [];

    // Add media to DTO
    const publicationDtoWithMedia: UpdatePublicationDto = {
      ...updatePublicationDto,
      media: [...(updatePublicationDto.media || []), ...mediaDtos],
    };

    const user = await this.userService.getUserById(payload.sub);
    return this.publicationService.update(id, publicationDtoWithMedia, user as User);
  }

  @Get('my/drafts')
  @UseGuards(AuthGuard)
  async getMyDrafts(@CurrentPayload() payload: JwtPayloadType) {
    const publications = await this.publicationService.findMyDrafts(payload.sub);

    return publications.map((publication) => ({
      id: publication.id,
      title: publication.title,
      content: publication.content,
      status: publication.status,
      createdAt: publication.createdAt,
      updatedAt: publication.updatedAt,
      category: publication.category
        ? { id: publication.category.id, name: publication.category.name }
        : null,
      tags: publication.tags?.map((tag) => ({ id: tag.id, name: tag.name })) || [],
      media: publication.media?.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimetype: m.mimetype,
        type: m.type,
        size: m.size,
      })) || [],
    }));
  }

  @Delete(':id')
  // @HttpCode(204)
  @UseGuards(AuthGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.publicationService.remove(id);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard)
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.publicationService.getHistory(id);
  }

  @Post(':id/revert/:versionNumber')
  @UseGuards(AuthGuard)
  async revertToVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const user = { id: payload.sub } as User;
    const publication = await this.publicationService.revertToVersion(
      id,
      versionNumber,
      user,
    );
    return {
      success: true,
      message: `Publication revenu à la version ${versionNumber}`,
      publication: { id: publication.id, title: publication.title, status: publication.status },
    };
  }

  @Post(':id/view')
  @UseGuards(AuthGuard)
  async incrementView(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const publicationId = parseInt(id);
      let userId: number | undefined = undefined; // Fixed: Initialized

      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const payload = this.jwtService.verify(token);
          userId = payload.sub;
        } catch (e) {
          // Log error but continue as anonymous
          console.log('Token invalide ou expiré');
        }
      }

      const forwarded = (req.headers as any)['x-forwarded-for'];
      const rawIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : null)
        || req.ip
        || (req.socket as any)?.remoteAddress
        || '';
      const ip = rawIp.trim() === '::1' ? '127.0.0.1' : rawIp.trim().replace(/^::ffff:/, '');

      // We call the service; userId will be number or undefined
      await this.publicationService.incrementView(publicationId, userId, ip);

      const publication = await this.publicationService.findOne(publicationId);

      return res.status(200).json({
        views: publication.viewsCount || 0,
        message: 'View recorded',
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Error recording view',
        views: 0,
      });
    }
  }
  @Post('search')
  @UseGuards(AuthGuard)
  async semanticSearch(@Body() body: any) {
    try {
      const query = String(body.q ?? '').trim();
      const limit = Number(body.limit ?? 10);
      const minSimilarity = Number(body.minSimilarity ?? 0.72);

      const statusStr = String(body.status ?? '').trim().toLowerCase();
      const validStatus: PublicationStatus = Object.values(PublicationStatus).includes(statusStr as PublicationStatus)
        ? (statusStr as PublicationStatus)
        : PublicationStatus.PUBLISHED;

      const safeLimit = Math.max(1, Math.min(isNaN(limit) ? 10 : limit, 50));
      const safeMinSimilarity = Math.max(0.1, Math.min(isNaN(minSimilarity) ? 0.72 : minSimilarity, 0.98));

      if (!query) {
        return {
          success: false,
          message: 'Query parameter "q" is required',
          results: [],
        };
      }

      const results = await this.publicationService.semanticSearch(
        query,
        safeLimit,
        safeMinSimilarity,
        validStatus,
      );

      return {
        success: true,
        query,
        params: {
          limit: safeLimit,
          minSimilarity: safeMinSimilarity,
          status: validStatus,
        },
        found: results.length,
        results,
      };
    } catch (err: any) {
      console.error('Search endpoint error:', err);
      return {
        success: false,
        message: 'Internal server error',
        debug: err.message || 'Check server logs',
      };
    }
  }

  // LIKE ENDPOINT
  @Post(':id/like')
  @UseGuards(AuthGuard)
  async toggleLike(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    try {
      const publication = await this.publicationInteractionService.toggleLike(
        id,
        payload.sub,
      );
      return {
        success: true,
        message: 'Like updated successfully',
        publication: {
          id: publication.id,
          title: publication.title,
          likesCount: publication.likes?.length || 0,
          isLiked:
            publication.likes?.some((like) => like.id === payload.sub) || false,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error updating like');
    }
  }

  // BOOKMARK ENDPOINT
  @Post(':id/bookmark')
  @UseGuards(AuthGuard)
  async toggleBookmark(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    try {
      const publication = await this.publicationInteractionService.toggleBookmark(
        id,
        payload.sub,
      );
      return {
        success: true,
        message: 'Bookmark updated successfully',
        publication: {
          id: publication.id,
          title: publication.title,
          bookmarksCount: publication.bookmarks?.length || 0,
          isBookmarked:
            publication.bookmarks?.some(
              (bookmark) => bookmark.id === payload.sub,
            ) || false,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message || 'Error updating bookmark');
    }
  }

  @Get('user/liked')
  @UseGuards(AuthGuard)
  async getUserLikedPublications(@CurrentPayload() payload: JwtPayloadType) {
    try {
      const publications = await this.publicationInteractionService.getUserLikedPublications(payload.sub);
      return {
        success: true,
        count: publications.length,
        publications: publications.map((publication) => ({
          id: publication.id,
          title: publication.title,
          description: publication.content?.substring(0, 150) + '...' || '',
          author: publication.author ? {
            id: publication.author.id,
            name: `${publication.author.firstName} ${publication.author.lastName}`,
            avatar: publication.author.profileImage,
            department: publication.author?.department,
          } : null,
          category: publication.category ? {
            id: publication.category.id,
            name: publication.category.name,
          } : null,
          media: publication.media?.map((m) => ({
            id: m.id,
            url: m.url,
            filename: m.filename,
            mimetype: m.mimetype,
            type: m.type,
            size: m.size,
          })) || [],
          createdAt: publication.createdAt,
          likesCount: publication.likes?.length || 0,
          bookmarksCount: publication.bookmarks?.length || 0,
          commentsCount: publication.comments?.length || 0,
          viewsCount: publication.viewsCount || 0,
          isLiked: true,
          isBookmarked: publication.bookmarks?.some(bookmark => bookmark.id === payload.sub) || false,
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/bookmarked')
  @UseGuards(AuthGuard)
  async getUserBookmarkedPublications(@CurrentPayload() payload: JwtPayloadType) {
    try {
      const publications = await this.publicationInteractionService.getUserBookmarkedPublications(payload.sub);
      return {
        success: true,
        count: publications.length,
        publications: publications.map((publication) => ({
          id: publication.id,
          title: publication.title,
          description: publication.content?.substring(0, 150) + '...' || '',
          author: publication.author ? {
            id: publication.author.id,
            name: `${publication.author.firstName} ${publication.author.lastName}`,
            avatar: publication.author.profileImage,
            department: publication.author?.department,
          } : null,
          category: publication.category ? {
            id: publication.category.id,
            name: publication.category.name,
          } : null,
          media: publication.media?.map((m) => ({
            id: m.id,
            url: m.url,
            filename: m.filename,
            mimetype: m.mimetype,
            type: m.type,
            size: m.size,
          })) || [],
          createdAt: publication.createdAt,
          likesCount: publication.likes?.length || 0,
          bookmarksCount: publication.bookmarks?.length || 0,
          commentsCount: publication.comments?.length || 0,
          viewsCount: publication.viewsCount || 0,
          isLiked: publication.likes?.some(like => like.id === payload.sub) || false,
          isBookmarked: true,
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  async getPublicationsByUserId(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const publications = await this.publicationService.getPublicationsByUserId(userId);

      // Retourner les publications avec toutes les données nécessaires
      return publications.map((publication) => ({
        id: publication.id,
        title: publication.title,
        content: publication.content,
        description: publication.content?.substring(0, 150) + '...' || '',
        author: publication.author ? {
          id: publication.author.id,
          name: `${publication.author.firstName || ''} ${publication.author.lastName || ''}`.trim() || 'User',
          firstName: publication.author.firstName,
          lastName: publication.author.lastName,
          avatar: publication.author.profileImage,
        } : null,
        category: publication.category ? {
          id: publication.category.id,
          name: publication.category.name,
        } : null,
        tags: publication.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],
        media: publication.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: publication.createdAt,
        status: publication.status,
        likes: publication.likes || [],
        bookmarks: publication.bookmarks || [],
        comments: publication.comments || [],
        stats: {
          likes: publication.likes?.length || 0,
          comments: publication.comments?.length || 0,
          views: publication.viewsCount || 0,
        },
        viewsCount: publication.viewsCount || 0,
      }));
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard)
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  async approveRejectedPublication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const publication = await this.publicationService.approveRejectedPublication(id, payload.sub);
    return {
      success: true,
      message: `Publication "${publication.title}" approuvé et publié avec succès`,
      publication: {
        id: publication.id,
        title: publication.title,
        status: publication.status,
      },
    };
  }

  @Post('check-duplicate')
  @UseGuards(AuthGuard)
  async checkDuplicate(
    @Body() dto: CheckDuplicateDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.publicationService.checkDuplicate(dto, payload.sub);
  }

  @Get('rejected/moderation')
  @UseGuards(AuthGuard)
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  async getPublicationsRejectedByModeration() {
    const publications = await this.publicationService.getPublicationsRejectedByModeration();
    return {
      success: true,
      count: publications.length,
      publications: publications.map((publication) => ({
        id: publication.id,
        title: publication.title,
        content: publication.content,
        rejectionReason: publication.rejectionReason,
        moderationScore: publication.moderationScore,
        moderationResult: publication.moderationResult,
        duplicateScore: publication.duplicateScore,
        similarPublicationsCache: publication.similarPublicationsCache,
        author: publication.author
          ? {
            id: publication.author.id,
            name: `${publication.author.firstName} ${publication.author.lastName}`,
            email: publication.author.email,
            role: publication.author.role,
            profileImage: publication.author.profileImage ?? null,
          }
          : null,
        category: publication.category
          ? {
            id: publication.category.id,
            name: publication.category.name,
          }
          : null,
        tags: publication.tags?.map((tag) => tag.name) || [],
        media: publication.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
      })),
    };
  }

  @Get('rejected/duplicates')
  @UseGuards(AuthGuard)
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  async getPublicationsRejectedByDuplicate() {
    const publications = await this.publicationService.getPublicationsRejectedByDuplicate();
    return {
      success: true,
      count: publications.length,
      publications: publications.map((publication) => ({
        id: publication.id,
        title: publication.title,
        content: publication.content,
        rejectionReason: publication.rejectionReason,
        moderationScore: publication.moderationScore,
        moderationResult: publication.moderationResult,
        duplicateScore: publication.duplicateScore,
        similarPublicationsCache: publication.similarPublicationsCache,
        author: publication.author
          ? {
            id: publication.author.id,
            name: `${publication.author.firstName} ${publication.author.lastName}`,
            email: publication.author.email,
            profileImage: publication.author.profileImage ?? null,
          }
          : null,
        category: publication.category
          ? {
            id: publication.category.id,
            name: publication.category.name,
          }
          : null,
        tags: publication.tags?.map((tag) => tag.name) || [],
        media: publication.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: publication.createdAt,
        updatedAt: publication.updatedAt,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Signalement d'publication
  // POST /api/publications/:id/report
  // ─────────────────────────────────────────────────────────────

  @Post(':id/report')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async reportPublication(
    @Param('id', ParseIntPipe) publicationId: number,
    @Body() dto: ReportPublicationDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const result = await this.publicationService.reportPublication(payload.sub, publicationId, dto);
    return { success: true, ...result };
  }
}
