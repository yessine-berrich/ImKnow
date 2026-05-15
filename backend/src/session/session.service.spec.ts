import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';

describe('SessionService', () => {
  let service: SessionService;
  let sessionRepository: jest.Mocked<Repository<Session>>;

  const mockSession: Partial<Session> = {
    id: 1,
    userId: 1,
    tokenHash: 'hashed-token',
    ipAddress: '127.0.0.1',
    isActive: true,
    expiresAt: new Date(Date.now() + 3600000),
    createdAt: new Date(),
    lastUsedAt: new Date(),
  };

  const mockQBFactory = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
  });

  const mockSessionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQBFactory()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: getRepositoryToken(Session), useValue: mockSessionRepo },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    sessionRepository = module.get(getRepositoryToken(Session));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      mockSessionRepo.create.mockReturnValue(mockSession);
      mockSessionRepo.save.mockResolvedValue(mockSession);

      const result = await service.createSession({
        userId: 1,
        token: 'raw-token',
        expiresAt: new Date(Date.now() + 3600000),
        ipAddress: '127.0.0.1',
      });

      expect(result).toBeDefined();
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('should return session if valid token', async () => {
      const validSession = { ...mockSession, expiresAt: new Date(Date.now() + 3600000) };
      mockSessionRepo.findOne.mockResolvedValue(validSession);
      mockSessionRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateSession('raw-token');

      expect(mockSessionRepo.findOne).toHaveBeenCalled();
      expect(result).toEqual(validSession);
    });

    it('should return null if session not found', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      const result = await service.validateSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null and deactivate expired session', async () => {
      const expiredSession = { ...mockSession, expiresAt: new Date(Date.now() - 3600000) };
      mockSessionRepo.findOne.mockResolvedValue(expiredSession);
      mockSessionRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.validateSession('expired-token');

      expect(result).toBeNull();
      expect(mockSessionRepo.update).toHaveBeenCalled();
    });
  });

  describe('getUserSessions', () => {
    it('should return all sessions for a user', async () => {
      const mockQB = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSession]),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      const result = await service.getUserSessions(1);

      expect(result).toBeDefined();
      expect(mockSessionRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('revokeByToken', () => {
    it('should revoke a session by token', async () => {
      mockSessionRepo.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeByToken('raw-token');

      expect(mockSessionRepo.update).toHaveBeenCalled();
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for a user', async () => {
      const mockQB = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      mockSessionRepo.createQueryBuilder.mockReturnValue(mockQB as any);

      await service.revokeAllUserSessions(1);

      expect(mockSessionRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
