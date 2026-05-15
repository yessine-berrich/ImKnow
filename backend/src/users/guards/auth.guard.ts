import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SessionService } from "src/session/session.service";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check Authorization header first
    let token = request.headers.authorization?.replace('Bearer ', '');

    // Fallback to query parameter for image requests
    if (!token) {
      token = request.query.token;
    }

    if (!token) return false;

    const session = await this.sessionService.validateSession(token);
    if (!session) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}