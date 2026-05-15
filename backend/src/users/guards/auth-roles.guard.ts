import { UsersService } from '../users.service';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadType } from 'utils/types';
import { Reflector } from '@nestjs/core';
import { userRole } from 'utils/constants';
import { ROLES_KEY } from '../decorators/user-role.decorator';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles: userRole[] = this.reflector.getAllAndOverride<userRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization header is missing or malformed',
      );
    }

    let payload: JwtPayloadType;
    let user: User | null;
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      payload = await this.jwtService.verifyAsync(token, { secret });

      user = await this.usersService.getCurrentUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token'); 
    }


    if (!roles || roles.length === 0) {
      return true;
    }

    if (roles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException(
      `Rôle non autorisé. Votre rôle ('${user.role}') n'est pas autorisé pour cette ressource. Rôles requis: ${roles.join(', ')}.`,
    );
  }
}