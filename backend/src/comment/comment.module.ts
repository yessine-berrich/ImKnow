import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CommentController } from './comment.controller';
import { NotificationModule } from 'src/notification/notification.module';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { User } from 'src/users/entities/user.entity';
import { Notification } from 'src/notification/entities/notification.entity';
import { Publication } from 'src/publication/entities/publication.entity';
import { PublicationModule } from 'src/publication/publication.module';

@Module({
  imports: [
    // 1. Enregistre l'entité pour générer le Repository
    TypeOrmModule.forFeature([Comment, User, Notification, Publication]),
    // 2. Importe les modules dont les services sont utilisés dans CommentService
    UsersModule,
    NotificationModule,
    PublicationModule,
  ],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService]
})
export class CommentModule {}
