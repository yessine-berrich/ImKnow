import { Controller, Delete, Get, Param, UseGuards, Headers } from '@nestjs/common';
import { SessionService } from './session.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { ActiveUserGuard } from 'src/users/guards/active-user.guard';
import { CurrentPayload } from 'src/users/decorators/current-payload.decorator';
import type { JwtPayloadType } from 'utils/types';

@Controller('api/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) { }

  @Get()
  @UseGuards(AuthGuard, ActiveUserGuard)
  async getMySessions(@CurrentPayload() payload: JwtPayloadType) {
    return this.sessionService.getUserSessions(payload.sub);
  }

  @Delete('revoke/:sessionId')
  @UseGuards(AuthGuard)
  async revokeSession(
    @Param('sessionId') sessionId: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.sessionService.revokeSession(sessionId, payload.sub);
  }

  @Delete('revoke-others')
  @UseGuards(AuthGuard)
  async revokeAllOtherSessions(
    @CurrentPayload() payload: JwtPayloadType,
    @Headers('authorization') authHeader: string,
  ) {
    const rawToken = authHeader?.replace('Bearer ', '');
    const current = rawToken ? await this.sessionService.getSessionByToken(rawToken) : null;
    await this.sessionService.revokeAllUserSessions(payload.sub, current?.id);
    return { message: 'All other sessions have been signed out' };
  }
}
