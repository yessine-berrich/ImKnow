import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType, userRole, UserStatus } from 'utils/constants';
import { JwtPayloadType } from 'utils/types';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { SessionService } from 'src/session/session.service';
import { AvatarUploadService } from './avatar-upload.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly sessionService: SessionService,
    private readonly avatarUploadService: AvatarUploadService,
  ) {}

  async register(registerDto: CreateUserDto): Promise<{ message: string }> {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await this.hashPassword(password);

    const newUser = this.userRepository.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
      verificationToken: randomBytes(32).toString('hex'),
      role: userRole.EMPLOYEE,
      isEmailActive: false,
      status: UserStatus.PENDING,
      isGoogleAccount: false,
    });

    const savedUser = await this.userRepository.save(newUser);
    const link = this.generateVerificationLink(savedUser.id, savedUser.verificationToken);

    await this.mailService.sendVerifyEmailTemplate(email, link);

    return {
      message: 'Verification token has been sent to your email, please verify your email address',
    };
  }

  private readonly MAX_LOGIN_ATTEMPTS = 3;
  private readonly LOCK_DURATION_MINUTES = 15;

  async login(
    loginDto: LoginDto,
    context?: { userAgent?: string; ipAddress?: string },
  ): Promise<{ accessToken: string } | { message: string }> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMs = user.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      throw new BadRequestException(
        `Compte temporairement bloqué. Réessayez dans ${remainingMin} minute${remainingMin > 1 ? 's' : ''}.`,
      );
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      user.loginAttempts = (user.loginAttempts ?? 0) + 1;

      if (user.loginAttempts >= this.MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000);
        user.loginAttempts = 0;
        await this.userRepository.save(user);

        throw new BadRequestException(
          `Trop de tentatives échouées. Compte bloqué pendant ${this.LOCK_DURATION_MINUTES} minutes.`,
        );
      }

      await this.userRepository.save(user);

      const remaining = this.MAX_LOGIN_ATTEMPTS - user.loginAttempts;
      throw new BadRequestException(
        `Email ou mot de passe incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`,
      );
    }

    if (user.loginAttempts > 0 || user.lockedUntil) {
      user.loginAttempts = 0;
      user.lockedUntil = null;
      await this.userRepository.save(user);
    }

    if (!user.isEmailActive) {
      let verificationToken = user.verificationToken;

      if (!verificationToken) {
        user.verificationToken = randomBytes(32).toString('hex');
        const result = await this.userRepository.save(user);
        verificationToken = result.verificationToken;
      }

      const link = this.generateVerificationLink(user.id, verificationToken);
      await this.mailService.sendVerifyEmailTemplate(email, link);

      return {
        message: 'Verification token has been sent to your email, please verify your email address',
      };
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        user.status === UserStatus.INACTIVE
          ? 'Your account has been deactivated. Please contact an administrator.'
          : 'Your account has not been approved by an administrator yet. Please wait for approval.',
      );
    }

    await this.userRepository.update(user.id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    const accessToken = await this.generateJWT({
      sub: user.id,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionService.createSession({
      userId: user.id,
      token: accessToken,
      userAgent: context?.userAgent,
      ipAddress: context?.ipAddress,
      expiresAt,
    });

    return { accessToken };
  }

  async logout(userId: number, token?: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, {
      isOnline: false,
      lastSeenAt: new Date(),
    });

    if (token) {
      await this.sessionService.revokeByToken(token);
    }

    return { message: 'Logged out successfully' };
  }

  async sendResetPasswordLink(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('User with given email does not exist');
    }

    user.resetPasswordToken = randomBytes(32).toString('hex');
    const result = await this.userRepository.save(user);

    const resetPasswordLink = `${this.config.get<string>('CLIENT_DOMAIN')}/reset-password/${user.id}/${result.resetPasswordToken}`;
    await this.mailService.sendResetPasswordTemplate(email, resetPasswordLink);

    return {
      message: 'Password reset link sent to your email, please check your inbox',
    };
  }

  async getResetPasswordLink(
    userId: number,
    resetPasswordToken: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invalid link');
    }

    if (user.resetPasswordToken === null || user.resetPasswordToken !== resetPasswordToken) {
      throw new BadRequestException('Invalid link');
    }

    return { message: 'Valid link' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { userId, resetPasswordToken, newPassword } = dto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Invalid link');
    }

    if (user.resetPasswordToken === null || user.resetPasswordToken !== resetPasswordToken) {
      throw new BadRequestException('Invalid link');
    }

    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    user.resetPasswordToken = '';
    await this.userRepository.save(user);

    await this.sessionService.revokeAllUserSessions(userId);

    return { message: 'Password reset successfully, please log in' };
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private generateJWT(payload: JwtPayloadType): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  private generateVerificationLink(userId: number, verificationToken: string): string {
    return `${this.config.get<string>('CLIENT_DOMAIN')}/verify-email/${userId}/${verificationToken}`;
  }

  async activateUser(userId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already activated');
    }

    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    await this.notificationService.createAndNotify(
      NotificationType.ACCOUNT_ACTIVATED,
      userId,
      null,
      'Votre compte a été activé. Vous pouvez maintenant accéder à la plateforme.',
      { userId },
    );

    return { message: 'User account has been activated successfully' };
  }

  async deactivateUser(userId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new BadRequestException('User is already deactivated');
    }

    user.status = UserStatus.INACTIVE;
    await this.userRepository.save(user);

    await this.notificationService.createAndNotify(
      NotificationType.ACCOUNT_DEACTIVATED,
      userId,
      null,
      "Votre compte a été désactivé. Contactez un administrateur pour plus d'informations.",
      { userId },
    );

    return { message: 'User account has been deactivated' };
  }

  async changeUserRole(
    adminId: number,
    targetUserId: number,
    newRole: userRole,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!Object.values(userRole).includes(newRole)) {
      throw new BadRequestException(
        `Invalid role. Possible values: ${Object.values(userRole).join(', ')}`,
      );
    }

    if (newRole === userRole.SUPERADMIN) {
      throw new BadRequestException(
        'Cannot assign SUPERADMIN role. Only ADMIN and EMPLOYEE roles can be assigned.',
      );
    }

    if (adminId === targetUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (newRole !== userRole.SUPERADMIN && user.role === userRole.SUPERADMIN) {
      const superAdminCount = await this.userRepository.count({
        where: { role: userRole.SUPERADMIN },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove SUPERADMIN role: at least one super-administrator must remain',
        );
      }
    }

    const oldRole = user.role;
    user.role = newRole;
    await this.userRepository.save(user);

    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    await this.notificationService.createAndNotify(
      NotificationType.USER_ROLE_CHANGED,
      targetUserId,
      admin,
      `Your role has been changed from ${oldRole} to ${newRole}`,
      { oldRole, newRole },
    );

    return {
      message: `User role has been successfully changed to: ${newRole}`,
    };
  }

  async validateOrCreateGoogleUser(googleUser: {
    email: string;
    firstName: string;
    lastName?: string;
    profileImage?: string;
    googleId: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ accessToken: string }> {
    let user = await this.userRepository.findOne({
      where: { email: googleUser.email },
    });

    if (!user) {
      // ── New user ────────────────────────────────────────────────────────
      const hashedPassword = await this.hashPassword(randomBytes(32).toString('hex'));

      // Download and convert the Google avatar to a local WebP file.
      // We pass userId=0 as a placeholder — the real id is set after save.
      // We'll update the file name immediately after.
      let localAvatarPath: string | null = null;
      if (googleUser.profileImage) {
        // Use a temp userId of 0; we rename after the real ID is known
        const tempPath = await this.avatarUploadService.downloadGoogleAvatar(
          googleUser.profileImage,
          0,
        );
        localAvatarPath = tempPath;
      }

      const newUser = new User();
      newUser.email = googleUser.email;
      newUser.firstName = googleUser.firstName;
      newUser.lastName = googleUser.lastName ?? '';
      newUser.password = hashedPassword;
      newUser.googleId = googleUser.googleId;
      newUser.isGoogleAccount = true;
      newUser.isEmailActive = true;
      newUser.status = UserStatus.PENDING;
      newUser.role = userRole.EMPLOYEE;
      // Fall back to the Google URL only if the download completely failed
      newUser.profileImage = localAvatarPath ?? (googleUser.profileImage ?? null) as any;
      newUser.googleAvatarUrl = googleUser.profileImage ?? null as any;
      newUser.verificationToken = null as any;
      newUser.resetPasswordToken = null as any;
      newUser.emailNotificationsEnabled = true;
      newUser.pushNotificationsEnabled = true;

      user = await this.userRepository.save(newUser);

      // Re-download with the correct userId to get a properly named file,
      // but only if the previous download succeeded (i.e. we have a local path).
      // This avoids a second network hit if the first already got the image.
      if (localAvatarPath && googleUser.profileImage) {
        const correctPath = await this.avatarUploadService.downloadGoogleAvatar(
          googleUser.profileImage,
          user.id,
          localAvatarPath, // deletes the temp user-0-*.webp file
        );
        if (correctPath) {
          user.profileImage = correctPath;
          await this.userRepository.save(user);
        }
      }
    } else {
      // ── Existing user ───────────────────────────────────────────────────
      let needsUpdate = false;

      if (!user.googleId) {
        user.googleId = googleUser.googleId;
        needsUpdate = true;
      }

      if (!user.isGoogleAccount) {
        user.isGoogleAccount = true;
        needsUpdate = true;
      }

      // Re-download the avatar when:
      // 1. The Google URL changed (user changed their Google profile picture), or
      // 2. The stored profileImage is still a remote URL (not yet migrated to local).
      if (googleUser.profileImage) {
        const urlChanged = googleUser.profileImage !== user.googleAvatarUrl;
        const notLocalYet = !user.profileImage || /^https?:\/\//i.test(user.profileImage);

        if (urlChanged || notLocalYet) {
          const downloaded = await this.avatarUploadService.downloadGoogleAvatar(
            googleUser.profileImage,
            user.id,
            user.profileImage, // old local file to delete (if any)
          );
          if (downloaded) {
            user.profileImage = downloaded;
            user.googleAvatarUrl = googleUser.profileImage;
            needsUpdate = true;
          }
        }
      }

      if (!user.isEmailActive) {
        user.isEmailActive = true;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.userRepository.save(user);
      }
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException(
        user.status === UserStatus.INACTIVE
          ? 'Your account has been deactivated. Please contact an administrator.'
          : 'Your account has not been approved by an administrator yet. Please wait for approval.',
      );
    }

    await this.userRepository.update(user.id, {
      isOnline: true,
      lastSeenAt: new Date(),
    });

    const accessToken = await this.generateJWT({ sub: user.id, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.sessionService.createSession({
      userId: user.id,
      token: accessToken,
      userAgent: googleUser.userAgent,
      ipAddress: googleUser.ipAddress,
      expiresAt,
    });

    return { accessToken };
  }

  async googleLogin(
    googleAuthDto: GoogleAuthDto,
  ): Promise<{ accessToken: string } | { message: string }> {
    return this.validateOrCreateGoogleUser(googleAuthDto);
  }
}
