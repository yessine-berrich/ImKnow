import { Module, Session } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './entities/media.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports: [
    // Indispensable pour injecter le repository dans MediaService
    TypeOrmModule.forFeature([Media]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'testestseste',
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    SessionModule
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
