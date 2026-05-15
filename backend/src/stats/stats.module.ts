import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Article } from 'src/article/entities/article.entity';
import { User } from 'src/users/entities/user.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { ArticleReport } from 'src/article/entities/article-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Article, User, Category, Tag, Comment, ArticleReport, UserReport]), UsersModule],
  controllers: [StatsController],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule { }