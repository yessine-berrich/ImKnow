import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { AuthGuard } from '../users/guards/auth.guard';
import { AuthRolesGuard } from '../users/guards/auth-roles.guard';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: jest.Mocked<CategoryService>;

  const mockCategory = {
    id: 1,
    name: 'Technology',
    description: 'Tech articles',
    articles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCategoryService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: mockCategoryService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthRolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all categories', async () => {
      mockCategoryService.findAll.mockResolvedValue([mockCategory]);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one category', async () => {
      mockCategoryService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockCategory);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a category', async () => {
      const dto = { name: 'Science', description: 'Science articles' };
      mockCategoryService.create.mockResolvedValue({ id: 2, ...dto });

      const result = await controller.create(dto as any);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const dto = { name: 'Updated' };
      mockCategoryService.update.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await controller.update(1, dto as any);

      expect(result.name).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
