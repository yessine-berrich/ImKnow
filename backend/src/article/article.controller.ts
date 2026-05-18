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
import { ArticleService } from './article.service';
import { ArticleInteractionService } from './article-interaction.service';
import { MediaService } from '../media/media.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { ReportArticleDto } from './dto/report-article.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Roles } from '../users/decorators/user-role.decorator';
import { CurrentPayload } from '../users/decorators/current-payload.decorator';
import { AuthGuard } from '../users/guards/auth.guard';
import { ArticleStatus, userRole } from 'utils/constants';
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


@Controller('api/articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly userService: UsersService,
    private readonly articleInteractionService: ArticleInteractionService,
    private readonly mediaService: MediaService,
    private readonly jwtService: JwtService,
  ) { }

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async create(
    @Body() createArticleDto: CreateArticleDto,
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
    const articleDtoWithMedia: CreateArticleDto = {
      ...createArticleDto,
      media: [...(createArticleDto.media || []), ...mediaDtos],
    };

    return this.articleService.create(articleDtoWithMedia, {
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

    const articles = await this.articleService.findAll();

    return articles.map(article => {
      const isLiked = userId ? article.likes?.some(like => like.id === userId) : false;
      const isBookmarked = userId ? article.bookmarks?.some(bookmark => bookmark.id === userId) : false;

      return {
        id: article.id,
        title: article.title,
        content: article.content,
        description: article.content?.substring(0, 150) + '...' || '',
        status: article.status,
        viewsCount: article.viewsCount || 0,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,

        author: article.author ? {
          id: article.author.id,
          name: `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() || 'User',
          initials: ((article.author.firstName?.charAt(0) || '') + (article.author.lastName?.charAt(0) || '')).toUpperCase() || 'U',
          department: article.author.department || 'Member',
          avatar: article.author.profileImage,
        } : null,

        category: article.category ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
        } : null,

        tags: article.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],

        media: article.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],

        stats: {
          likes: article.likes?.length || 0,
          comments: article.comments?.length || 0,
          views: article.viewsCount || 0,
        },

        isLiked: isLiked,
        isBookmarked: isBookmarked,
        isFeatured: (article.viewsCount || 0) > 1000,
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

    const article = await this.articleService.findOne(id);

    // Calculer isLiked et isBookmarked à partir des tableaux chargés
    const isLiked = userId ? article.likes?.some(like => like.id === userId) : false;
    const isBookmarked = userId ? article.bookmarks?.some(bookmark => bookmark.id === userId) : false;

    // Retourner l'article formaté avec toutes les informations
    return {
      id: article.id,
      title: article.title,
      content: article.content,
      description: article.content?.substring(0, 150) + '...' || '',
      status: article.status,
      viewsCount: article.viewsCount || 0,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,

      author: article.author ? {
        id: article.author.id,
        name: `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() || 'User',
        initials: ((article.author.firstName?.charAt(0) || '') + (article.author.lastName?.charAt(0) || '')).toUpperCase() || 'U',
        department: article.author.role || 'Member',
        avatar: article.author.profileImage,
      } : null,
      category: article.category ? {
        id: article.category.id,
        name: article.category.name,
        slug: article.category.name?.toLowerCase().replace(/\s+/g, '-') || '',
      } : null,
      tags: article.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],
      stats: {
        likes: article.likes?.length || 0,
        comments: article.comments?.length || 0,
        views: article.viewsCount || 0,
      },
      isLiked,
      isBookmarked,
      isFeatured: (article.viewsCount || 0) > 1000,
      likes: article.likes,
      bookmarks: article.bookmarks,
      comments: article.comments,
      media: article.media?.map((m) => ({
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
  async getArticleMedia(@Param('id', ParseIntPipe) id: number) {
    const media = await this.articleService.getArticleMedia(id);
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
    @Body() updateArticleDto: UpdateArticleDto,
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
    const articleDtoWithMedia: UpdateArticleDto = {
      ...updateArticleDto,
      media: [...(updateArticleDto.media || []), ...mediaDtos],
    };

    const user = await this.userService.getUserById(payload.sub);
    return this.articleService.update(id, articleDtoWithMedia, user as User);
  }

  @Get('my/drafts')
  @UseGuards(AuthGuard)
  async getMyDrafts(@CurrentPayload() payload: JwtPayloadType) {
    const articles = await this.articleService.findMyDrafts(payload.sub);

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      content: article.content,
      status: article.status,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      category: article.category
        ? { id: article.category.id, name: article.category.name }
        : null,
      tags: article.tags?.map((tag) => ({ id: tag.id, name: tag.name })) || [],
      media: article.media?.map((m) => ({
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
    return this.articleService.remove(id);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard)
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.articleService.getHistory(id);
  }

  @Post(':id/revert/:versionNumber')
  @UseGuards(AuthGuard)
  async revertToVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const user = { id: payload.sub } as User;
    const article = await this.articleService.revertToVersion(
      id,
      versionNumber,
      user,
    );
    return {
      success: true,
      message: `Article revenu à la version ${versionNumber}`,
      article: { id: article.id, title: article.title, status: article.status },
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
      const articleId = parseInt(id);
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
      await this.articleService.incrementView(articleId, userId, ip);

      const article = await this.articleService.findOne(articleId);

      return res.status(200).json({
        views: article.viewsCount || 0,
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
      const validStatus: ArticleStatus = Object.values(ArticleStatus).includes(statusStr as ArticleStatus)
        ? (statusStr as ArticleStatus)
        : ArticleStatus.PUBLISHED;

      const safeLimit = Math.max(1, Math.min(isNaN(limit) ? 10 : limit, 50));
      const safeMinSimilarity = Math.max(0.1, Math.min(isNaN(minSimilarity) ? 0.72 : minSimilarity, 0.98));

      if (!query) {
        return {
          success: false,
          message: 'Query parameter "q" is required',
          results: [],
        };
      }

      const results = await this.articleService.semanticSearch(
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
      const article = await this.articleInteractionService.toggleLike(
        id,
        payload.sub,
      );
      return {
        success: true,
        message: 'Like updated successfully',
        article: {
          id: article.id,
          title: article.title,
          likesCount: article.likes?.length || 0,
          isLiked:
            article.likes?.some((like) => like.id === payload.sub) || false,
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
      const article = await this.articleInteractionService.toggleBookmark(
        id,
        payload.sub,
      );
      return {
        success: true,
        message: 'Bookmark updated successfully',
        article: {
          id: article.id,
          title: article.title,
          bookmarksCount: article.bookmarks?.length || 0,
          isBookmarked:
            article.bookmarks?.some(
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
  async getUserLikedArticles(@CurrentPayload() payload: JwtPayloadType) {
    try {
      const articles = await this.articleInteractionService.getUserLikedArticles(payload.sub);
      return {
        success: true,
        count: articles.length,
        articles: articles.map((article) => ({
          id: article.id,
          title: article.title,
          description: article.content?.substring(0, 150) + '...' || '',
          author: article.author ? {
            id: article.author.id,
            name: `${article.author.firstName} ${article.author.lastName}`,
            avatar: article.author.profileImage,
            department: article.author?.department,
          } : null,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
          } : null,
          media: article.media?.map((m) => ({
            id: m.id,
            url: m.url,
            filename: m.filename,
            mimetype: m.mimetype,
            type: m.type,
            size: m.size,
          })) || [],
          createdAt: article.createdAt,
          likesCount: article.likes?.length || 0,
          bookmarksCount: article.bookmarks?.length || 0,
          commentsCount: article.comments?.length || 0,
          viewsCount: article.viewsCount || 0,
          isLiked: true,
          isBookmarked: article.bookmarks?.some(bookmark => bookmark.id === payload.sub) || false,
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/bookmarked')
  @UseGuards(AuthGuard)
  async getUserBookmarkedArticles(@CurrentPayload() payload: JwtPayloadType) {
    try {
      const articles = await this.articleInteractionService.getUserBookmarkedArticles(payload.sub);
      return {
        success: true,
        count: articles.length,
        articles: articles.map((article) => ({
          id: article.id,
          title: article.title,
          description: article.content?.substring(0, 150) + '...' || '',
          author: article.author ? {
            id: article.author.id,
            name: `${article.author.firstName} ${article.author.lastName}`,
            avatar: article.author.profileImage,
            department: article.author?.department,
          } : null,
          category: article.category ? {
            id: article.category.id,
            name: article.category.name,
          } : null,
          media: article.media?.map((m) => ({
            id: m.id,
            url: m.url,
            filename: m.filename,
            mimetype: m.mimetype,
            type: m.type,
            size: m.size,
          })) || [],
          createdAt: article.createdAt,
          likesCount: article.likes?.length || 0,
          bookmarksCount: article.bookmarks?.length || 0,
          commentsCount: article.comments?.length || 0,
          viewsCount: article.viewsCount || 0,
          isLiked: article.likes?.some(like => like.id === payload.sub) || false,
          isBookmarked: true,
        })),
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard)
  async getArticlesByUserId(@Param('userId', ParseIntPipe) userId: number) {
    try {
      const articles = await this.articleService.getArticlesByUserId(userId);

      // Retourner les articles avec toutes les données nécessaires
      return articles.map((article) => ({
        id: article.id,
        title: article.title,
        content: article.content,
        description: article.content?.substring(0, 150) + '...' || '',
        author: article.author ? {
          id: article.author.id,
          name: `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim() || 'User',
          firstName: article.author.firstName,
          lastName: article.author.lastName,
          avatar: article.author.profileImage,
        } : null,
        category: article.category ? {
          id: article.category.id,
          name: article.category.name,
        } : null,
        tags: article.tags?.map(tag => ({ id: tag.id, name: tag.name })).filter(t => t.id) || [],
        media: article.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: article.createdAt,
        status: article.status,
        likes: article.likes || [],
        bookmarks: article.bookmarks || [],
        comments: article.comments || [],
        stats: {
          likes: article.likes?.length || 0,
          comments: article.comments?.length || 0,
          views: article.viewsCount || 0,
        },
        viewsCount: article.viewsCount || 0,
      }));
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN)
  async approveRejectedArticle(
    @Param('id', ParseIntPipe) id: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const article = await this.articleService.approveRejectedArticle(id, payload.sub);
    return {
      success: true,
      message: `Article "${article.title}" approuvé et publié avec succès`,
      article: {
        id: article.id,
        title: article.title,
        status: article.status,
      },
    };
  }

  @Post('check-duplicate')
  @UseGuards(AuthGuard)
  async checkDuplicate(
    @Body() dto: CheckDuplicateDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.articleService.checkDuplicate(dto, payload.sub);
  }

  @Get('rejected/moderation')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN)
  async getArticlesRejectedByModeration() {
    const articles = await this.articleService.getArticlesRejectedByModeration();
    return {
      success: true,
      count: articles.length,
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        content: article.content,
        rejectionReason: article.rejectionReason,
        moderationScore: article.moderationScore,
        moderationResult: article.moderationResult,
        duplicateScore: article.duplicateScore,
        similarArticlesCache: article.similarArticlesCache,
        author: article.author
          ? {
            id: article.author.id,
            name: `${article.author.firstName} ${article.author.lastName}`,
            email: article.author.email,
            role: article.author.role,
            profileImage: article.author.profileImage ?? null,
          }
          : null,
        category: article.category
          ? {
            id: article.category.id,
            name: article.category.name,
          }
          : null,
        tags: article.tags?.map((tag) => tag.name) || [],
        media: article.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      })),
    };
  }

  @Get('rejected/duplicates')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN)
  async getArticlesRejectedByDuplicate() {
    const articles = await this.articleService.getArticlesRejectedByDuplicate();
    return {
      success: true,
      count: articles.length,
      articles: articles.map((article) => ({
        id: article.id,
        title: article.title,
        content: article.content,
        rejectionReason: article.rejectionReason,
        moderationScore: article.moderationScore,
        moderationResult: article.moderationResult,
        duplicateScore: article.duplicateScore,
        similarArticlesCache: article.similarArticlesCache,
        author: article.author
          ? {
            id: article.author.id,
            name: `${article.author.firstName} ${article.author.lastName}`,
            email: article.author.email,
            profileImage: article.author.profileImage ?? null,
          }
          : null,
        category: article.category
          ? {
            id: article.category.id,
            name: article.category.name,
          }
          : null,
        tags: article.tags?.map((tag) => tag.name) || [],
        media: article.media?.map((m) => ({
          id: m.id,
          url: m.url,
          filename: m.filename,
          mimetype: m.mimetype,
          type: m.type,
          size: m.size,
        })) || [],
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Signalement d'article
  // POST /api/articles/:id/report
  // ─────────────────────────────────────────────────────────────

  @Post(':id/report')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async reportArticle(
    @Param('id', ParseIntPipe) articleId: number,
    @Body() dto: ReportArticleDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const result = await this.articleService.reportArticle(payload.sub, articleId, dto);
    return { success: true, ...result };
  }
}
