import { Test, TestingModule } from '@nestjs/testing';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [{ provide: SessionService, useValue: mockSessionService }],
    }).compile();

    controller = module.get<SessionController>(SessionController);
    service = module.get(SessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
