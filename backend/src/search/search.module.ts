import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Article } from '../article/entities/article.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Article, Category, Tag, User]),
    HttpModule,
    UsersModule
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
