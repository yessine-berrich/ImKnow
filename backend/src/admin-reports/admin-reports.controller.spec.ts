import { Test, TestingModule } from '@nestjs/testing';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';

describe('AdminReportsController', () => {
  let controller: AdminReportsController;
  let service: jest.Mocked<AdminReportsService>;

  const mockPayload = { sub: 99, email: 'admin@example.com', role: 'ADMIN' };

  const mockArticleReportsResult = {
    items: [{ articleId: 1, title: 'Test', reportCount: 2 }],
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
    getReportedArticles: jest.fn(),
    getArticleReportDetail: jest.fn(),
    takeActionOnArticle: jest.fn(),
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

  describe('getReportedArticles', () => {
    it('should call service with correct params and return result', async () => {
      mockService.getReportedArticles.mockResolvedValue(mockArticleReportsResult);

      const result = await controller.getReportedArticles('pending', 'all', 'all', '', 1, 20);

      expect(result).toEqual(mockArticleReportsResult);
      expect(mockService.getReportedArticles).toHaveBeenCalledWith({
        status: 'pending', riskLevel: 'all', priority: 'all', search: '', page: 1, limit: 20,
      });
    });
  });

  describe('getArticleReportDetail', () => {
    it('should return detail for a given article', async () => {
      const mockDetail = { article: { id: 1, title: 'Test' }, intelligence: {}, reports: [] };
      mockService.getArticleReportDetail.mockResolvedValue(mockDetail);

      const result = await controller.getArticleReportDetail(1);

      expect(result).toEqual(mockDetail);
      expect(mockService.getArticleReportDetail).toHaveBeenCalledWith(1);
    });
  });

  describe('takeActionOnArticle', () => {
    it('should call takeActionOnArticle with correct params', async () => {
      const mockResult = { message: 'Action done', action: 'dismiss_all' };
      mockService.takeActionOnArticle.mockResolvedValue(mockResult);

      const result = await controller.takeActionOnArticle(
        1,
        { action: 'dismiss_all', note: 'Spam cleared' },
        mockPayload as any,
      );

      expect(result).toEqual(mockResult);
      expect(mockService.takeActionOnArticle).toHaveBeenCalledWith(1, 'dismiss_all', 99, 'Spam cleared');
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
