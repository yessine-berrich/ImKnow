import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { Article } from 'src/article/entities/article.entity';
import { ArticleView } from 'src/article/entities/article-view.entity';
import { User } from 'src/users/entities/user.entity';
import { Follow } from 'src/follow/entities/follow.entity';
import { UsersModule } from 'src/users/users.module';
import { FollowModule } from 'src/follow/follow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, ArticleView, User, Follow]),
    UsersModule,
    FollowModule,
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}