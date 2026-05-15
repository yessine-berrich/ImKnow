import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailModule } from 'src/mail/mail.module';
import { NotificationModule } from 'src/notification/notification.module';
import { AuthGuard } from './guards/auth.guard';
import { ActiveUserGuard } from './guards/active-user.guard';
import { GoogleStrategy } from './auth/google.strategy';
import { SessionModule } from 'src/session/session.module';
import { Session } from 'src/session/entities/session.entity';
import { UserReport } from './entities/user-report.entity';
import { AvatarUploadService } from './avatar-upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session, UserReport]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7h' },
      }),
      inject: [ConfigService],
    }),
    NotificationModule,
    MailModule,
    forwardRef(() => SessionModule),
  ],
  providers: [
    UsersService,
    AuthService,
    AvatarUploadService,
    AuthGuard,
    ActiveUserGuard,
    GoogleStrategy,
  ],
  controllers: [UsersController],
  exports: [
    UsersService,
    AuthService,
    AvatarUploadService,
    JwtModule,
    AuthGuard,
    ActiveUserGuard,
    forwardRef(() => SessionModule),
  ],
})
export class UsersModule {}
