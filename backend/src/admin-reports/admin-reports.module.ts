import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { Publication } from 'src/publication/entities/publication.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PublicationReport, UserReport, Publication, User]),
    UsersModule,
    NotificationModule,
  ],
  controllers: [AdminReportsController],
  providers: [AdminReportsService],
})
export class AdminReportsModule {}
