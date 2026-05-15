import { Module } from '@nestjs/common';
import { TagService } from './tag.service';
import { TagController } from './tag.controller';
import { Tag } from './entities/tag.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { Article } from 'src/article/entities/article.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, Article]),
    UsersModule
  ],
  controllers: [TagController],
  providers: [TagService],
  exports: [TagService],
})
export class TagModule {}
