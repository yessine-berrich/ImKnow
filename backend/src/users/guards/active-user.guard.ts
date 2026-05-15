// src/users/guards/active-user.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserStatus } from 'utils/constants';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.user; // Récupéré par AuthGuard

    if (!payload) {
      return true; // Laisser passer, AuthGuard s'en chargera
    }

    const user = await this.userRepository.findOne({ 
      where: { id: payload.sub } 
    });

    if (!user || !user.isEmailActive || user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('Votre compte a été désactivé. Veuillez contacter un administrateur.');
    }

    return true;
  }
}