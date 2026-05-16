import { SearchModule } from './../search/search.module';
import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { Article } from './entities/article.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticleVersion } from './entities/article-version.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { UsersModule } from 'src/users/users.module';
import { MediaModule } from 'src/media/media.module';
import { ArticleView } from './entities/article-view.entity';
import { ArticleReport } from './entities/article-report.entity';
import { User } from 'src/users/entities/user.entity';
import { ArticleInteractionService } from './article-interaction.service';
import { ContentModerationModule } from 'src/content-moderation/content-moderation.module';
import { NotificationModule } from 'src/notification/notification.module';
import { ArticleVersioningService } from './article-versioning.service';
import { ArticleChunk } from './entities/article-chunk.entity';
import { ArticleChunkService } from './article-chunk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Article,
      ArticleVersion,
      Category,
      Tag,
      ArticleView,
      ArticleReport,
      User,
      ArticleChunk,
    ]),
    UsersModule,
    MediaModule,
    SearchModule,
    ContentModerationModule,
    NotificationModule,
  ],
  controllers: [ArticleController],
  providers: [ArticleService, ArticleInteractionService, ArticleVersioningService, ArticleChunkService],
  exports: [ArticleService, ArticleInteractionService, ArticleVersioningService, ArticleChunkService],
})
export class ArticleModule {}
