import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from 'src/users/users.module';
import { PublicationModule } from 'src/publication/publication.module';
import { Publication } from 'src/publication/entities/publication.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Publication]),
    UsersModule,
    PublicationModule
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
