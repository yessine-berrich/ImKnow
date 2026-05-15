import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';
import { Session } from './entities/session.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, User]),
    forwardRef(() => UsersModule),
  ],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}