// src/admin-reports/admin-reports.controller.ts
import {
  Controller, Get, Post, Put, Param, Body, Query, Res,
  ParseIntPipe, DefaultValuePipe, UseGuards,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminReportsService } from './admin-reports.service';
import type { ReportAction, AutoModerationConfig } from './admin-reports.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';
import { Roles } from 'src/users/decorators/user-role.decorator';
import { CurrentPayload } from 'src/users/decorators/current-payload.decorator';
import type { JwtPayloadType } from 'utils/types';
import { userRole } from 'utils/constants';
import { IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

class TakePublicationActionDto {
  @IsIn(['dismiss_all', 'review_all', 'unpublish', 'republish', 'warn_author'])
  action: 'dismiss_all' | 'review_all' | 'unpublish' | 'republish' | 'warn_author';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class TakeUserActionDto {
  @IsIn(['dismiss_all', 'review_all', 'warn', 'ban', 'unban'])
  action: 'dismiss_all' | 'review_all' | 'warn' | 'ban' | 'unban';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class BulkPublicationActionDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['dismiss_all', 'review_all', 'unpublish', 'republish', 'warn_author'])
  action: ReportAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

class BulkUserActionDto {
  @IsArray()
  @IsInt({ each: true })
  ids: number[];

  @IsIn(['dismiss_all', 'review_all', 'warn', 'ban', 'unban'])
  action: ReportAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

@Controller('api/admin/reports')
@UseGuards(AuthGuard, AuthRolesGuard)
@Roles(userRole.SUPERADMIN, userRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  // ── Publication reports ──────────────────────────────────────────────────────

  @Get('publications')
  getReportedPublications(
    @Query('status',    new DefaultValuePipe('all'))   status:    string,
    @Query('riskLevel', new DefaultValuePipe('all'))   riskLevel: string,
    @Query('priority',  new DefaultValuePipe('all'))   priority:  string,
    @Query('search',    new DefaultValuePipe(''))      search:    string,
    @Query('page',      new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit',     new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminReportsService.getReportedPublications({ status, riskLevel, priority, search, page, limit });
  }

  @Get('publications/:publicationId')
  getPublicationReportDetail(
    @Param('publicationId', ParseIntPipe) publicationId: number,
  ) {
    return this.adminReportsService.getPublicationReportDetail(publicationId);
  }

  @Post('publications/:publicationId/action')
  @HttpCode(200)
  takeActionOnPublication(
    @Param('publicationId', ParseIntPipe) publicationId: number,
    @Body() dto: TakePublicationActionDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.adminReportsService.takeActionOnPublication(publicationId, dto.action, payload.sub, dto.note);
  }

  @Post('publications/bulk')
  @HttpCode(200)
  bulkPublicationAction(
    @Body() dto: BulkPublicationActionDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.adminReportsService.bulkPublicationAction(dto.ids, dto.action, payload.sub, dto.note);
  }

  // ── User reports ─────────────────────────────────────────────────────────

  @Get('users')
  getReportedUsers(
    @Query('status',    new DefaultValuePipe('all'))   status:    string,
    @Query('riskLevel', new DefaultValuePipe('all'))   riskLevel: string,
    @Query('priority',  new DefaultValuePipe('all'))   priority:  string,
    @Query('search',    new DefaultValuePipe(''))      search:    string,
    @Query('page',      new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit',     new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminReportsService.getReportedUsers({ status, riskLevel, priority, search, page, limit });
  }

  @Get('users/:userId')
  getUserReportDetail(
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.adminReportsService.getUserReportDetail(userId);
  }

  @Post('users/:userId/action')
  @HttpCode(200)
  takeActionOnUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: TakeUserActionDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.adminReportsService.takeActionOnUser(userId, dto.action, payload.sub, dto.note);
  }

  @Post('users/bulk')
  @HttpCode(200)
  bulkUserAction(
    @Body() dto: BulkUserActionDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.adminReportsService.bulkUserAction(dto.ids, dto.action, payload.sub, dto.note);
  }

  // ── Config ────────────────────────────────────────────────────────────────

  @Get('config')
  getConfig(): AutoModerationConfig {
    return this.adminReportsService.getConfig();
  }

  @Put('config')
  updateConfig(@Body() body: Partial<AutoModerationConfig>): AutoModerationConfig {
    return this.adminReportsService.updateConfig(body);
  }

  // ── Export ────────────────────────────────────────────────────────────────

  @Get('export')
  async exportReports(
    @Query('type')   type:   'publications' | 'users',
    @Query('format') format: 'csv' | 'json',
    @Res() res: Response,
  ) {
    const data = await this.adminReportsService.exportReports(type ?? 'publications', format ?? 'json');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="reports-${type}-${Date.now()}.csv"`);
      res.send(data);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="reports-${type}-${Date.now()}.json"`);
      res.json(data);
    }
  }
}
