import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  Res,
  Query,
  ForbiddenException,
  Req,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'fs';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { Roles } from './decorators/user-role.decorator';
import { CurrentPayload } from './decorators/current-payload.decorator';
import { AuthGuard } from './guards/auth.guard';
import { AuthRolesGuard } from './guards/auth-roles.guard';
import { ActiveUserGuard } from './guards/active-user.guard';
import { userRole } from 'utils/constants';
import type { JwtPayloadType } from 'utils/types';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ConfigService } from '@nestjs/config';
import { SessionService } from 'src/session/session.service';
import { AvatarUploadService } from './avatar-upload.service';

// Accepted MIME types for avatar uploads
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly avatarUploadService: AvatarUploadService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private extractIp(req: any): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    const raw = (typeof forwarded === 'string' ? forwarded.split(',')[0] : null)
      || req.ip
      || req.socket?.remoteAddress
      || '';
    // Normalize IPv6 loopback → IPv4 loopback
    return raw.trim() === '::1' ? '127.0.0.1' : raw.trim().replace(/^::ffff:/, '');
  }

  // ── Google Auth ───────────────────────────────────────────────────────────

  @Post('google')
  async googleLogin(
    @Body() googleAuthDto: GoogleAuthDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    try {
      return await this.authService.googleLogin({ ...googleAuthDto, userAgent, ipAddress: this.extractIp(req) });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('google')
  async googleAuth() {}

  @Get('google/callback')
  async googleAuthRedirect(@Req() req, @Res() res) {
    try {
      const result = await this.authService.validateOrCreateGoogleUser(req.user);
      const frontendUrl = this.configService.get('FRONTEND_URL');
      return res.redirect(`${frontendUrl}/auth/google-callback?token=${result.accessToken}`);
    } catch (error) {
      return res.redirect(`${this.configService.get('FRONTEND_URL')}/signin?error=google_auth_failed`);
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  @Post('/auth/register')
  register(@Body() body: CreateUserDto) {
    return this.usersService.register(body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/auth/login')
  login(
    @Body() body: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Req() req: any,
  ) {
    return this.usersService.login(body, { userAgent, ipAddress: this.extractIp(req) });
  }

  @Post('/auth/logout')
  @UseGuards(AuthGuard)
  async logout(
    @CurrentPayload() payload: JwtPayloadType,
    @Headers('authorization') authHeader: string,
  ) {
    const rawToken = authHeader?.replace('Bearer ', '') ?? undefined;
    return this.usersService.logout(payload.sub, rawToken);
  }

  @Get('/current-user')
  @UseGuards(AuthGuard, ActiveUserGuard)
  getCurrentUser(@CurrentPayload() payload: JwtPayloadType) {
    return this.usersService.getCurrentUser(payload.sub);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  // @Get('me/sessions')
  // @UseGuards(AuthGuard, ActiveUserGuard)
  // async getMySessions(@CurrentPayload() payload: JwtPayloadType) {
  //   return this.sessionService.getUserSessions(payload.sub);
  // }

  // @Delete('me/sessions/:sessionId')
  // @UseGuards(AuthGuard)
  // async revokeSession(
  //   @Param('sessionId') sessionId: string,
  //   @CurrentPayload() payload: JwtPayloadType,
  // ) {
  //   return this.sessionService.revokeSession(sessionId, payload.sub);
  // }

  // @Delete('me/sessions')
  // @UseGuards(AuthGuard)
  // async revokeAllOtherSessions(
  //   @CurrentPayload() payload: JwtPayloadType,
  //   @Headers('authorization') authHeader: string,
  // ) {
  //   const rawToken = authHeader?.replace('Bearer ', '');
  //   const current = rawToken ? await this.sessionService.getSessionByToken(rawToken) : null;
  //   await this.sessionService.revokeAllUserSessions(payload.sub, current?.id);
  //   return { message: 'All other sessions have been signed out' };
  // }

  // ── Email change ──────────────────────────────────────────────────────────

  @Post('me/change-email')
  @UseGuards(AuthGuard, ActiveUserGuard)
  async requestEmailChange(
    @CurrentPayload() payload: JwtPayloadType,
    @Body('newEmail') newEmail: string,
  ) {
    return this.usersService.requestEmailChange(payload.sub, newEmail);
  }

  @Get('confirm-email-change/:userId/:token')
  async confirmEmailChange(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('token') token: string,
    @Res() res,
  ) {
    try {
      await this.usersService.confirmEmailChange(userId, token);
      const clientDomain = this.configService.get<string>('CLIENT_DOMAIN');
      return res.redirect(`${clientDomain}/signin?message=email_changed`);
    } catch {
      const clientDomain = this.configService.get<string>('CLIENT_DOMAIN');
      return res.redirect(`${clientDomain}/profile/security?error=email_change_failed`);
    }
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Post('admin/:id/activate')
  @Roles(userRole.SUPERADMIN)
  @UseGuards(AuthRolesGuard, ActiveUserGuard)
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.activateUser(id);
  }

  @Post('admin/:id/deactivate')
  @Roles(userRole.SUPERADMIN)
  @UseGuards(AuthRolesGuard, ActiveUserGuard)
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deactivateUser(id);
  }

  @Post('admin/users/:id/role')
  @Roles(userRole.SUPERADMIN)
  @UseGuards(AuthRolesGuard, ActiveUserGuard)
  async updateRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body('role') newRole: userRole,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.usersService.changeUserRole(payload.sub, userId, newRole);
  }

  @Patch('me/notifications-preferences')
  @UseGuards(AuthGuard, ActiveUserGuard)
  async updateNotificationPreferences(
    @CurrentPayload() payload: JwtPayloadType,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.usersService.updateNotificationPreferences(payload.sub, dto);
  }

  @Get()
  @UseGuards(AuthRolesGuard, ActiveUserGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Post(':id/report')
  @UseGuards(AuthGuard, ActiveUserGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async reportUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() reportUserDto: ReportUserDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.usersService.reportUser(payload.sub, id, reportUserDto);
  }

  @Get('verify-email/:id/:verificationToken')
  verifyEmail(
    @Param('id', ParseIntPipe) id: number,
    @Param('verificationToken') verificationToken: string,
  ) {
    return this.usersService.verifyEmail(id, verificationToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.usersService.sendResetPassword(body.email);
  }

  @Get('reset-password/:id/:resetPasswordToken')
  getResetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Param('resetPasswordToken') resetPasswordToken: string,
  ) {
    return this.usersService.getResetPassword(id, resetPasswordToken);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.usersService.resetPassword(body);
  }

  // ── Profile update (with optional avatar upload) ──────────────────────────

  @Patch(':id')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('profileImage', {
      // Multer writes a raw temp file that we'll convert to WebP via sharp
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'avatars'));
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `tmp-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `Type de fichier non supporté. Formats acceptés : JPEG, PNG, WebP, GIF.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
    }),
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    // ── Ownership guard ───────────────────────────────────────────────────
    if (payload.sub !== id && payload.role !== userRole.ADMIN && payload.role !== userRole.SUPERADMIN) {
      // Discard uploaded temp file before throwing
      if (file) unlink(file.path, () => {});
      throw new ForbiddenException('Vous ne pouvez modifier que votre propre profil.');
    }

    const user = await this.usersService.getUserById(id);

    const updateData: Partial<UpdateUserDto> & { profileImage?: string | null } = {
      ...updateUserDto,
    };
    delete (updateData as any).removeProfileImage;

    if (updateUserDto.removeProfileImage) {
      // Delete the current avatar file from disk
      this.avatarUploadService.deleteOldAvatar(user.profileImage);
      updateData.profileImage = null;
    }

    if (file) {
      // Convert temp file → WebP, delete old avatar, return new local path
      updateData.profileImage = await this.avatarUploadService.processUploadedFile(
        file.path,
        id,
        user.profileImage,
      );
    }

    return this.usersService.update(id, updateData as UpdateUserDto);
  }

  // ── Account deletion ──────────────────────────────────────────────────────

  @Delete('admin/:id')
  @Roles(userRole.SUPERADMIN)
  @UseGuards(AuthRolesGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteOwnAccount(
    @CurrentPayload() payload: JwtPayloadType,
    @Body('password') password?: string,
  ) {
    return this.usersService.deleteOwnAccount(payload.sub, password);
  }

  @Get('delete-account/confirm/:userId/:token')
  async confirmAccountDeletion(
    @Param('userId') userId: string,
    @Param('token') token: string,
  ) {
    return this.usersService.confirmAccountDeletion(parseInt(userId), token);
  }

  @Get('search')
  @UseGuards(AuthGuard)
  async search(@Query('q') q: string) {
    return this.usersService.searchUsers(q);
  }

  @Post(':id/change-password')
  @UseGuards(AuthGuard, ActiveUserGuard)
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const isAdmin = payload.role === userRole.ADMIN || payload.role === userRole.SUPERADMIN;
    if (payload.sub !== id && !isAdmin) {
      throw new ForbiddenException("You cannot change another user's password");
    }
    return this.usersService.changePassword(id, changePasswordDto);
  }
}
