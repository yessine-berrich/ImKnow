import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';

describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let service: jest.Mocked<AdminReportsService>;

  const mockPayload = { sub: 99, email: 'admin@example.com', role: 'ADMIN' };

  const mockPublicationReportsResult = {
    items: [{ publicationId: 1, title: 'Test', reportCount: 2 }],
    total: 1,
    page: 1,
    totalPages: 1,
    summary: { critical: 0, high: 0, medium: 0, low: 1, urgent: 0, totalPending: 1 },
  };

  const mockUserReportsResult = {
    items: [{ userId: 10, userName: 'Alice Smith', reportCount: 1 }],
    total: 1,
    page: 1,
    totalPages: 1,
    summary: { critical: 0, high: 0, medium: 0, low: 1, urgent: 0, totalPending: 1, bannedUsers: 0 },
  };

  const mockService = {
    getReportedPublications: jest.fn(),
    getPublicationReportDetail: jest.fn(),
    takeActionOnPublication: jest.fn(),
    getReportedUsers: jest.fn(),
    getUserReportDetail: jest.fn(),
    takeActionOnUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminReportsController],
      providers: [
        { provide: AdminReportsService, useValue: mockService },
      ],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthRolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminReportsController>(AdminReportsController);
    service = module.get(AdminReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getReportedPublications', () => {
    it('should call service with correct params and return result', async () => {
      mockService.getReportedPublications.mockResolvedValue(mockPublicationReportsResult);

      const result = await controller.getReportedPublications('pending', 'all', 'all', '', 1, 20);

      expect(result).toEqual(mockPublicationReportsResult);
      expect(mockService.getReportedPublications).toHaveBeenCalledWith({
        status: 'pending', riskLevel: 'all', priority: 'all', search: '', page: 1, limit: 20,
      });
    });
  });

  describe('getPublicationReportDetail', () => {
    it('should return detail for a given publication', async () => {
      const mockDetail = { publication: { id: 1, title: 'Test' }, intelligence: {}, reports: [] };
      mockService.getPublicationReportDetail.mockResolvedValue(mockDetail);

      const result = await controller.getPublicationReportDetail(1);

      expect(result).toEqual(mockDetail);
      expect(mockService.getPublicationReportDetail).toHaveBeenCalledWith(1);
    });
  });

  describe('takeActionOnPublication', () => {
    it('should call takeActionOnPublication with correct params', async () => {
      const mockResult = { message: 'Action done', action: 'dismiss_all' };
      mockService.takeActionOnPublication.mockResolvedValue(mockResult);

      const result = await controller.takeActionOnPublication(
        1,
        { action: 'dismiss_all', note: 'Spam cleared' },
        mockPayload as any,
      );

      expect(result).toEqual(mockResult);
      expect(mockService.takeActionOnPublication).toHaveBeenCalledWith(1, 'dismiss_all', 99, 'Spam cleared');
    });
  });

  describe('getReportedUsers', () => {
    it('should call service with correct params and return result', async () => {
      mockService.getReportedUsers.mockResolvedValue(mockUserReportsResult);

      const result = await controller.getReportedUsers('all', 'high', 'all', '', 1, 20);

      expect(result).toEqual(mockUserReportsResult);
      expect(mockService.getReportedUsers).toHaveBeenCalledWith({
        status: 'all', riskLevel: 'high', priority: 'all', search: '', page: 1, limit: 20,
      });
    });
  });

  describe('getUserReportDetail', () => {
    it('should return detail for a given user', async () => {
      const mockDetail = { user: { id: 10 }, intelligence: {}, reports: [] };
      mockService.getUserReportDetail.mockResolvedValue(mockDetail);

      const result = await controller.getUserReportDetail(10);

      expect(result).toEqual(mockDetail);
      expect(mockService.getUserReportDetail).toHaveBeenCalledWith(10);
    });
  });

  describe('takeActionOnUser', () => {
    it('should call takeActionOnUser with correct params', async () => {
      const mockResult = { message: 'User warned', action: 'warn' };
      mockService.takeActionOnUser.mockResolvedValue(mockResult);

      const result = await controller.takeActionOnUser(
        10,
        { action: 'warn' },
        mockPayload as any,
      );

      expect(result).toEqual(mockResult);
      expect(mockService.takeActionOnUser).toHaveBeenCalledWith(10, 'warn', 99, undefined);
    });
  });
});
