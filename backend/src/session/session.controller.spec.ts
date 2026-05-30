import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { AuthGuard } from '../users/guards/auth.guard';
import { ActiveUserGuard } from '../users/guards/active-user.guard';

describe('SessionController', () => {
  let controller: SessionController;
  let service: jest.Mocked<SessionService>;

  const mockSessionService = {
    createSession: jest.fn(),
    getUserSessions: jest.fn(),
    validateSession: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllUserSessions: jest.fn(),
    revokeByToken: jest.fn(),
    getSessionByToken: jest.fn(),
  };

  const mockPayload = { sub: 1, email: 'user@example.com', role: 'EMPLOYEE' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(ActiveUserGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMySessions', () => {
    it('should return sessions for the current user', async () => {
      const mockSessions = [{ id: 'session-1', userAgent: 'Chrome' }];
      mockSessionService.getUserSessions.mockResolvedValue(mockSessions);

      const result = await controller.getMySessions(mockPayload as any);

      expect(result).toEqual(mockSessions);
      expect(service.getUserSessions).toHaveBeenCalledWith(1);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      const mockResult = { message: 'Session revoked' };
      mockSessionService.revokeSession.mockResolvedValue(mockResult);

      const result = await controller.revokeSession('session-1', mockPayload as any);

      expect(result).toEqual(mockResult);
      expect(service.revokeSession).toHaveBeenCalledWith('session-1', 1);
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      mockSessionService.getSessionByToken.mockResolvedValue({ id: 'current-session' });
      mockSessionService.revokeAllUserSessions.mockResolvedValue(undefined);

      const result = await controller.revokeAllOtherSessions(
        mockPayload as any,
        'Bearer some-token',
      );

      expect(result).toEqual({ message: 'All other sessions have been signed out' });
      expect(service.getSessionByToken).toHaveBeenCalledWith('some-token');
      expect(service.revokeAllUserSessions).toHaveBeenCalledWith(1, 'current-session');
    });
  });
});
