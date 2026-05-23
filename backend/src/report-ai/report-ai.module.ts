import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportAIService } from './report-ai.service';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicationReport, UserReport])],
  providers: [ReportAIService],
  exports: [ReportAIService],
})
export class ReportAIModule {}
