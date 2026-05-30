import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminReportsService } from './admin-reports.service';
import { PublicationReport } from 'src/publication/entities/publication-report.entity';
import { UserReport } from 'src/users/entities/user-report.entity';
import { Publication } from 'src/publication/entities/publication.entity';
import { User } from 'src/users/entities/user.entity';
import { ReportAdminNote } from './entities/report-admin-note.entity';
import { NotificationService } from 'src/notification/notification.service';
import { PublicationStatus, UserStatus } from 'utils/constants';

describe('AdminReportsService', () => {
  let service: AdminReportsService;

  const now = new Date();

  const mockPublication = {
    id: 1,
    title: 'Test Publication',
    status: PublicationStatus.PUBLISHED,
    content: 'Some publication content for testing purposes.',
    author: { id: 2, firstName: 'John', lastName: 'Doe' },
    createdAt: now,
  };

  const mockReporter = { id: 3, firstName: 'Reporter', lastName: 'User' };

  const mockPublicationReport = {
    id: 1,
    reason: 'spam',
    details: 'Spam content',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    aiAnalyzedAt: null,
    publication: mockPublication,
    reporter: mockReporter,
  };

  const mockUser = {
    id: 10,
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    department: 'Engineering',
    isActive: true,
    status: UserStatus.ACTIVE,
    role: 'employee',
    createdAt: now,
  };

  const mockUserReport = {
    id: 2,
    reason: 'harassment',
    details: 'Harassing behaviour',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    aiAnalyzedAt: null,
    reportedUser: mockUser,
    reporter: mockReporter,
  };

  const makeQB = (results: any[]) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
  });

  const mockPublicationReportRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserReportRepo = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockPublicationRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockReportNoteRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockNotificationService = {
    createAndNotify: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminReportsService,
        { provide: getRepositoryToken(PublicationReport), useValue: mockPublicationReportRepo },
        { provide: getRepositoryToken(UserReport),        useValue: mockUserReportRepo },
        { provide: getRepositoryToken(Publication),       useValue: mockPublicationRepo },
        { provide: getRepositoryToken(User),              useValue: mockUserRepo },
        { provide: getRepositoryToken(ReportAdminNote),   useValue: mockReportNoteRepo },
        { provide: NotificationService,                   useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<AdminReportsService>(AdminReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════
  // getReportedPublications
  // ═══════════════════════════════════════════════════════════════

  describe('getReportedPublications', () => {
    it('should return paginated publication report entries', async () => {
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockPublicationReport]));

      const result = await service.getReportedPublications({});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].publicationId).toBe(1);
      expect(result.items[0].title).toBe('Test Publication');
      expect(result.items[0].reportCount).toBe(1);
      expect(result.summary).toBeDefined();
    });

    it('should return empty result when no reports', async () => {
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB([]));

      const result = await service.getReportedPublications({});

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should filter by riskLevel', async () => {
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockPublicationReport]));

      const result = await service.getReportedPublications({ riskLevel: 'critical' });

      // spam score is low, so riskLevel is 'low' → filtered out
      expect(result.items).toHaveLength(0);
    });

    it('should filter by search term', async () => {
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockPublicationReport]));

      const result = await service.getReportedPublications({ search: 'Test' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toContain('Test');
    });

    it('should filter by search term that matches nothing', async () => {
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockPublicationReport]));

      const result = await service.getReportedPublications({ search: 'zzz_nomatch' });

      expect(result.items).toHaveLength(0);
    });

    it('should apply status filter via QB andWhere when status is not all', async () => {
      const qb = makeQB([]);
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getReportedPublications({ status: 'pending' });

      expect(qb.andWhere).toHaveBeenCalledWith('r.status = :status', { status: 'pending' });
    });

    it('should not call andWhere when status is all', async () => {
      const qb = makeQB([]);
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getReportedPublications({ status: 'all' });

      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('should paginate results correctly', async () => {
      const reports = Array.from({ length: 5 }, (_, i) => ({
        ...mockPublicationReport,
        id: i + 1,
        publication: { ...mockPublication, id: i + 1, title: `Publication ${i + 1}` },
      }));
      mockPublicationReportRepo.createQueryBuilder.mockReturnValue(makeQB(reports));

      const result = await service.getReportedPublications({ page: 1, limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.totalPages).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getPublicationReportDetail
  // ═══════════════════════════════════════════════════════════════

  describe('getPublicationReportDetail', () => {
    it('should return full publication report detail', async () => {
      mockPublicationRepo.findOne.mockResolvedValue(mockPublication);
      mockPublicationReportRepo.find.mockResolvedValue([mockPublicationReport]);

      const result = await service.getPublicationReportDetail(1);

      expect(result.publication.id).toBe(1);
      expect(result.publication.title).toBe('Test Publication');
      expect(result.intelligence).toBeDefined();
      expect(result.intelligence.riskScore).toBeDefined();
      expect(result.intelligence.recommendation).toBeDefined();
      expect(result.reports).toHaveLength(1);
      expect(result.reports[0].reason).toBe('spam');
    });

    it('should throw NotFoundException when publication not found', async () => {
      mockPublicationRepo.findOne.mockResolvedValue(null);

      await expect(service.getPublicationReportDetail(999)).rejects.toThrow(NotFoundException);
    });

    it('should handle publication with no reports', async () => {
      mockPublicationRepo.findOne.mockResolvedValue(mockPublication);
      mockPublicationReportRepo.find.mockResolvedValue([]);

      const result = await service.getPublicationReportDetail(1);

      expect(result.reports).toHaveLength(0);
      expect(result.intelligence.riskScore).toBe(0);
    });

    it('should recommend unpublish for hate_speech', async () => {
      mockPublicationRepo.findOne.mockResolvedValue(mockPublication);
      mockPublicationReportRepo.find.mockResolvedValue([
        { ...mockPublicationReport, reason: 'hate_speech' },
      ]);

      const result = await service.getPublicationReportDetail(1);

      expect(result.intelligence.recommendation.action).toBe('unpublish');
      expect(result.intelligence.recommendation.severity).toBe('danger');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // takeActionOnPublication
  // ═══════════════════════════════════════════════════════════════

  describe('takeActionOnPublication', () => {
    beforeEach(() => {
      mockPublicationRepo.findOne.mockResolvedValue(mockPublication);
      mockPublicationReportRepo.find.mockResolvedValue([mockPublicationReport]);
    });

    it('should dismiss_all pending reports', async () => {
      const result = await service.takeActionOnPublication(1, 'dismiss_all', 99);

      expect(mockPublicationReportRepo.update).toHaveBeenCalledWith(
        { publication: { id: 1 }, status: 'pending' },
        { status: 'dismissed', adminNote: null },
      );
      expect(result.action).toBe('dismiss_all');
    });

    it('should review_all pending reports', async () => {
      const result = await service.takeActionOnPublication(1, 'review_all', 99);

      expect(mockPublicationReportRepo.update).toHaveBeenCalledWith(
        { publication: { id: 1 }, status: 'pending' },
        { status: 'reviewed', adminNote: null },
      );
      expect(result.action).toBe('review_all');
    });

    it('should unpublish the publication and mark reports reviewed', async () => {
      const result = await service.takeActionOnPublication(1, 'unpublish', 99);

      expect(mockPublicationRepo.update).toHaveBeenCalledWith(1, { status: PublicationStatus.REJECTED });
      expect(mockPublicationReportRepo.update).toHaveBeenCalled();
      expect(result.action).toBe('unpublish');
    });

    it('should warn_author and mark reports reviewed', async () => {
      const result = await service.takeActionOnPublication(1, 'warn_author', 99);

      expect(mockPublicationReportRepo.update).toHaveBeenCalled();
      expect(result.action).toBe('warn_author');
    });

    it('should throw NotFoundException when publication not found', async () => {
      mockPublicationRepo.findOne.mockResolvedValue(null);

      await expect(service.takeActionOnPublication(999, 'dismiss_all', 99))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid action', async () => {
      await expect(service.takeActionOnPublication(1, 'ban' as any, 99))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getReportedUsers
  // ═══════════════════════════════════════════════════════════════

  describe('getReportedUsers', () => {
    it('should return paginated user report entries', async () => {
      mockUserReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockUserReport]));

      const result = await service.getReportedUsers({});

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].userId).toBe(10);
      expect(result.items[0].userName).toBe('Alice Smith');
      expect(result.items[0].reportCount).toBe(1);
      expect(result.summary).toBeDefined();
      expect(result.summary.bannedUsers).toBeDefined();
    });

    it('should return empty when no user reports', async () => {
      mockUserReportRepo.createQueryBuilder.mockReturnValue(makeQB([]));

      const result = await service.getReportedUsers({});

      expect(result.total).toBe(0);
      expect(result.items).toHaveLength(0);
    });

    it('should filter by search term matching username', async () => {
      mockUserReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockUserReport]));

      const result = await service.getReportedUsers({ search: 'Alice' });

      expect(result.items).toHaveLength(1);
    });

    it('should filter by search term matching email', async () => {
      mockUserReportRepo.createQueryBuilder.mockReturnValue(makeQB([mockUserReport]));

      const result = await service.getReportedUsers({ search: 'alice@' });

      expect(result.items).toHaveLength(1);
    });

    it('should count banned users in summary', async () => {
      const bannedReport = {
        ...mockUserReport,
        reportedUser: { ...mockUser, status: UserStatus.INACTIVE },
      };
      mockUserReportRepo.createQueryBuilder.mockReturnValue(makeQB([bannedReport]));

      const result = await service.getReportedUsers({});

      expect(result.summary.bannedUsers).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getUserReportDetail
  // ═══════════════════════════════════════════════════════════════

  describe('getUserReportDetail', () => {
    it('should return full user report detail', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserReportRepo.find.mockResolvedValue([mockUserReport]);

      const result = await service.getUserReportDetail(10);

      expect(result.user.id).toBe(10);
      expect(result.user.name).toBe('Alice Smith');
      expect(result.intelligence).toBeDefined();
      expect(result.intelligence.recommendation).toBeDefined();
      expect(result.reports).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserReportDetail(999)).rejects.toThrow(NotFoundException);
    });

    it('should recommend unban for inactive user', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, status: UserStatus.INACTIVE });
      mockUserReportRepo.find.mockResolvedValue([mockUserReport]);

      const result = await service.getUserReportDetail(10);

      expect(result.intelligence.recommendation.action).toBe('unban');
    });

    it('should recommend ban for harassment on active user with high risk', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const heavyReports = Array.from({ length: 5 }, () => ({
        ...mockUserReport,
        reason: 'harassment',
        createdAt: new Date(),
      }));
      mockUserReportRepo.find.mockResolvedValue(heavyReports);

      const result = await service.getUserReportDetail(10);

      expect(result.intelligence.recommendation.severity).toMatch(/danger|warning/);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // takeActionOnUser
  // ═══════════════════════════════════════════════════════════════

  describe('takeActionOnUser', () => {
    beforeEach(() => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
    });

    it('should dismiss_all pending user reports', async () => {
      const result = await service.takeActionOnUser(10, 'dismiss_all', 99);

      expect(mockUserReportRepo.update).toHaveBeenCalledWith(
        { reportedUser: { id: 10 }, status: 'pending' },
        { status: 'dismissed', adminNote: null },
      );
      expect(result.action).toBe('dismiss_all');
    });

    it('should review_all pending user reports', async () => {
      const result = await service.takeActionOnUser(10, 'review_all', 99);

      expect(mockUserReportRepo.update).toHaveBeenCalled();
      expect(result.action).toBe('review_all');
    });

    it('should warn user and mark reports reviewed', async () => {
      const result = await service.takeActionOnUser(10, 'warn', 99);

      expect(mockUserReportRepo.update).toHaveBeenCalled();
      expect(result.action).toBe('warn');
    });

    it('should ban user and mark reports reviewed', async () => {
      const result = await service.takeActionOnUser(10, 'ban', 99);

      expect(mockUserRepo.update).toHaveBeenCalledWith(10, { status: UserStatus.INACTIVE });
      expect(mockUserReportRepo.update).toHaveBeenCalled();
      expect(result.action).toBe('ban');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.takeActionOnUser(999, 'warn', 99))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when admin acts on themselves', async () => {
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, id: 99 });

      await expect(service.takeActionOnUser(99, 'warn', 99))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid action', async () => {
      await expect(service.takeActionOnUser(10, 'unpublish' as any, 99))
        .rejects.toThrow(BadRequestException);
    });
  });
});
