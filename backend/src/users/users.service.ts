import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from './entities/user.entity';
import { UserReport } from './entities/user-report.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { ReportUserDto } from './dto/report-user.dto';
import { AuthService } from './auth.service';
import { userRole } from 'utils/constants';
import { MailService } from 'src/mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { SessionService } from 'src/session/session.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserReport)
    private readonly userReportRepository: Repository<UserReport>,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async getCurrentUser(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async register(registerDto: CreateUserDto) {
    return this.authService.register(registerDto);
  }

  async login(loginDto: LoginDto, context?: { userAgent?: string; ipAddress?: string }) {
    return this.authService.login(loginDto, context);
  }

  async logout(userId: number, rawToken?: string) {
    return this.authService.logout(userId, rawToken);
  }

  async activateUser(id: number) {
    return this.authService.activateUser(id);
  }

  async deactivateUser(id: number) {
    return this.authService.deactivateUser(id);
  }

  async changeUserRole(adminId: number, targetUserId: number, newRole: userRole) {
    return this.authService.changeUserRole(adminId, targetUserId, newRole);
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({ relations: ['publications'] });
  }

  async getUserById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['publications'],
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé.`);
    }

    return user;
  }

  async verifyEmail(userId: number, verificationToken: string): Promise<{ message: string }> {
    const user = await this.getCurrentUser(userId);

    if (!user) throw new NotFoundException('User not found');
    if (user.verificationToken === null) throw new NotFoundException('There is no verification token');
    if (user.verificationToken !== verificationToken) throw new BadRequestException('Invalid link');

    user.isEmailActive = true;
    user.verificationToken = null as unknown as string;
    await this.userRepository.save(user);

    return { message: 'Your email has been verified, please log in to your account' };
  }

  sendResetPassword(email: string) {
    return this.authService.sendResetPasswordLink(email);
  }

  getResetPassword(userId: number, resetPasswordToken: string) {
    return this.authService.getResetPasswordLink(userId, resetPasswordToken);
  }

  resetPassword(dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  async findByNames(mentions: { firstName: string; lastName: string }[]): Promise<User[]> {
    if (mentions.length === 0) return [];

    const query = this.userRepository.createQueryBuilder('user');

    mentions.forEach((mention, index) => {
      const firstParam = `first${index}`;
      const lastParam = `last${index}`;
      const condition = `(user.firstName = :${firstParam} AND user.lastName = :${lastParam})`;

      if (index === 0) {
        query.where(condition, { [firstParam]: mention.firstName, [lastParam]: mention.lastName });
      } else {
        query.orWhere(condition, { [firstParam]: mention.firstName, [lastParam]: mention.lastName });
      }
    });

    return query.getMany();
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { profileImage, ...rest } = updateUserDto;
    const user = await this.userRepository.preload({
      id,
      ...rest,
      ...(profileImage !== undefined ? { profileImage } : {}),
    });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.userRepository.remove(user);
    return { message: `User with ID ${id} has been successfully deleted` };
  }

  async deleteOwnAccount(
    userId: number,
    password?: string,
  ): Promise<{ message: string; success: boolean; requiresEmailConfirmation?: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    if (user.isGoogleAccount) {
      const deletionToken = randomBytes(32).toString('hex');
      user.resetPasswordToken = deletionToken;
      await this.userRepository.save(user);

      const clientDomain = this.configService.get<string>('CLIENT_DOMAIN') || 'http://localhost:3001';
      const confirmLink = `${clientDomain}/delete-account/confirm/${user.id}/${deletionToken}`;

      await this.mailService.sendDeleteAccountConfirmationEmail(user.email, confirmLink, user.firstName);

      return {
        success: true,
        message: 'A confirmation email has been sent to your email address. Please click the link to confirm account deletion.',
        requiresEmailConfirmation: true,
      };
    }

    if (!password) {
      throw new BadRequestException('Password is required to delete your account');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ForbiddenException('Incorrect password. Account deletion failed.');
    }

    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'Your account has been successfully deleted. We are sorry to see you go.',
    };
  }

  async confirmAccountDeletion(
    userId: number,
    token: string,
  ): Promise<{ message: string; success: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, resetPasswordToken: token },
    });

    if (!user) throw new BadRequestException('Invalid or expired confirmation link');
    if (!user.isGoogleAccount) throw new BadRequestException('This endpoint is only for Google accounts');

    await this.userRepository.remove(user);

    return {
      success: true,
      message: 'Your account has been successfully deleted. We are sorry to see you go.',
    };
  }

  async searchUsers(query: string): Promise<Partial<User>[]> {
    if (!query || query.length < 2) return [];

    return this.userRepository.find({
      where: [{ firstName: ILike(`${query}%`) }, { lastName: ILike(`${query}%`) }],
      select: ['id', 'firstName', 'lastName'],
      take: 5,
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    // Security: revoke all sessions after a password change
    await this.sessionService.revokeAllUserSessions(userId);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async reportUser(
    reporterId: number,
    reportedUserId: number,
    dto: ReportUserDto,
  ): Promise<{ message: string; reportId: number }> {
    if (reporterId === reportedUserId) {
      throw new BadRequestException('Vous ne pouvez pas signaler votre propre profil');
    }

    const [reporter, reportedUser] = await Promise.all([
      this.userRepository.findOne({ where: { id: reporterId } }),
      this.userRepository.findOne({ where: { id: reportedUserId } }),
    ]);

    if (!reporter) throw new NotFoundException('Reporter not found');
    if (!reportedUser) throw new NotFoundException('Utilisateur à signaler introuvable');

    const existingPendingReport = await this.userReportRepository.findOne({
      where: {
        reporter: { id: reporterId },
        reportedUser: { id: reportedUserId },
        status: 'pending',
      },
    });

    if (existingPendingReport) {
      throw new BadRequestException('Vous avez déjà signalé ce profil. Le signalement est en cours de traitement.');
    }

    const report = this.userReportRepository.create({
      reporter,
      reportedUser,
      reason: dto.reason,
      details: dto.details?.trim() || null,
      status: 'pending',
    });

    const savedReport = await this.userReportRepository.save(report);

    return {
      message: 'Signalement envoyé. Merci de nous aider à garder la plateforme sûre.',
      reportId: savedReport.id,
    };
  }

  async updateNotificationPreferences(
    userId: number,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<{ message: string }> {
    if (dto.emailNotificationsEnabled === undefined && dto.pushNotificationsEnabled === undefined) {
      return { message: 'No preferences to update' };
    }

    await this.userRepository.update(userId, dto);
    return { message: 'Notification preferences updated successfully' };
  }

  // ── Email change ──────────────────────────────────────────────────────────

  /**
   * Step 1 — the user requests a new email address.
   * A confirmation link (valid 1 h) is sent to their CURRENT email for security.
   */
  async requestEmailChange(userId: number, newEmail: string): Promise<{ message: string }> {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      throw new BadRequestException('Please provide a valid email address');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isGoogleAccount) {
      throw new BadRequestException('Google accounts cannot change their email here. Manage your email at myaccount.google.com');
    }

    if (user.email === newEmail) {
      throw new BadRequestException('The new email is the same as your current email');
    }

    const existing = await this.userRepository.findOne({ where: { email: newEmail } });
    if (existing) {
      throw new BadRequestException('This email address is already in use');
    }

    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.pendingEmail = newEmail;
    user.emailChangeToken = token;
    user.emailChangeTokenExpiry = expiry;
    await this.userRepository.save(user);

    const clientDomain = this.configService.get<string>('CLIENT_DOMAIN');
    const confirmLink = `${clientDomain}/confirm-email-change/${userId}/${token}`;

    await this.mailService.sendEmailChangeConfirmation(user.email, confirmLink, user.firstName, newEmail);

    return {
      message: 'A confirmation link has been sent to your current email address. Please check your inbox — the link expires in 1 hour.',
    };
  }

  /**
   * Step 2 — the user clicked the confirmation link in their old email.
   * Applies the new email and revokes all existing sessions.
   */
  async confirmEmailChange(userId: number, token: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException('User not found');

    if (!user.emailChangeToken || user.emailChangeToken !== token) {
      throw new BadRequestException('Invalid confirmation link');
    }

    if (!user.emailChangeTokenExpiry || user.emailChangeTokenExpiry < new Date()) {
      // Clean up expired pending change
      user.pendingEmail = null as unknown as string;
      user.emailChangeToken = null as unknown as string;
      user.emailChangeTokenExpiry = null as unknown as Date;
      await this.userRepository.save(user);
      throw new BadRequestException('This confirmation link has expired. Please request a new email change.');
    }

    const newEmail = user.pendingEmail;
    if (!newEmail) throw new BadRequestException('No pending email change found');

    // Double-check the new email is still available
    const conflict = await this.userRepository.findOne({ where: { email: newEmail } });
    if (conflict) throw new BadRequestException('This email address is no longer available');

    // Apply the change
    user.email = newEmail;
    user.pendingEmail = null as unknown as string;
    user.emailChangeToken = null as unknown as string;
    user.emailChangeTokenExpiry = null as unknown as Date;
    await this.userRepository.save(user);

    // Sign out all sessions — the user must re-authenticate with the new email
    await this.sessionService.revokeAllUserSessions(userId);

    return { message: 'Your email has been updated. Please log in again with your new address.' };
  }
}
