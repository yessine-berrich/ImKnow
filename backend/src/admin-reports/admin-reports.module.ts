import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { ArticleReport } from 'src/article/entities/article-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { Article } from 'src/article/entities/article.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArticleReport, UserReport, Article, User]),
    UsersModule,
    NotificationModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
