import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { ArticleModule } from 'src/article/article.module';
import { Article } from 'src/article/entities/article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Article]),
    UsersModule,
    ArticleModule
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
