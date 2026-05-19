import { SearchModule } from './../search/search.module';
import { Module } from '@nestjs/common';
import { PublicationService } from './publication.service';
import { PublicationController } from './publication.controller';
import { Publication } from './entities/publication.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicationVersion } from './entities/publication-version.entity';
import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { UsersModule } from 'src/users/users.module';
import { MediaModule } from 'src/media/media.module';
import { PublicationView } from './entities/publication-view.entity';
import { PublicationReport } from './entities/publication-report.entity';
import { User } from 'src/users/entities/user.entity';
import { PublicationInteractionService } from './publication-interaction.service';
import { ContentModerationModule } from 'src/content-moderation/content-moderation.module';
import { NotificationModule } from 'src/notification/notification.module';
import { PublicationVersioningService } from './publication-versioning.service';
import { PublicationChunk } from './entities/publication-chunk.entity';
import { PublicationChunkService } from './publication-chunk.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Publication,
      PublicationVersion,
      Category,
      Tag,
      PublicationView,
      PublicationReport,
      User,
      PublicationChunk,
    ]),
    UsersModule,
    MediaModule,
    SearchModule,
    ContentModerationModule,
    NotificationModule,
  ],
  controllers: [PublicationController],
  providers: [PublicationService, PublicationInteractionService, PublicationVersioningService, PublicationChunkService],
  exports: [PublicationService, PublicationInteractionService, PublicationVersioningService, PublicationChunkService],
})
export class PublicationModule {}
