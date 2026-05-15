import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ArticleModule } from './article/article.module';
import { CategoryModule } from './category/category.module';
import { TagModule } from './tag/tag.module';
import { CommentModule } from './comment/comment.module';
import { Comment } from './comment/entities/comment.entity';
import { Tag } from './tag/entities/tag.entity';
import { Category } from './category/entities/category.entity';
import { ArticleVersion } from './article/entities/article-version.entity';
import { Article } from './article/entities/article.entity';
import { User } from './users/entities/user.entity';
import { MailModule } from './mail/mail.module';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { RagModule } from './rag/rag.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';
import { StatsModule } from './stats/stats.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { FollowModule } from './follow/follow.module';
import { SearchModule } from './search/search.module';
import { ChatModule } from './chat/chat.module';
import { SessionModule } from './session/session.module';
import { UserReport } from './users/entities/user-report.entity';
import { AdminReportsModule } from './admin-reports/admin-reports.module';

@Module({
  imports: [
    UsersModule,
    MailModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'pfe_db',
      autoLoadEntities: true,
      synchronize: false, // dev only
    }),
    ArticleModule,
    CategoryModule,
    TagModule,
    CommentModule,
    NotificationModule,
    MediaModule,
    RagModule,
    ContentModerationModule,
    StatsModule,
    RecommendationModule,
    FollowModule,
    SearchModule,
    ChatModule,
    SessionModule,
    AdminReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
