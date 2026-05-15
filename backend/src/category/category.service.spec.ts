import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { Category } from './entities/category.entity';
import { NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: jest.Mocked<Repository<Category>>;

  const mockCategory: Category = {
    id: 1,
    name: 'Technology',
    description: 'Tech articles',
    articles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Category;

  const mockCategoryRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    categoryRepository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all categories ordered by name', async () => {
      mockCategoryRepo.find.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockCategoryRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);

      const result = await service.findOne(1);

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const createDto = { name: 'Science', description: 'Science articles' };
      mockCategoryRepo.create.mockReturnValue({ ...createDto, id: 2 } as any);
      mockCategoryRepo.save.mockResolvedValue({ ...createDto, id: 2 } as any);

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockCategoryRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto = { name: 'Updated Tech' };
      mockCategoryRepo.findOne.mockResolvedValueOnce(mockCategory);
      mockCategoryRepo.findOne.mockResolvedValueOnce(null);
      mockCategoryRepo.save.mockResolvedValue({ ...mockCategory, ...updateDto });

      const result = await service.update(1, updateDto);

      expect(result.name).toBe('Updated Tech');
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a category', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(mockCategory);
      mockCategoryRepo.remove.mockResolvedValue(mockCategory);

      await service.remove(1);

      expect(mockCategoryRepo.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoryRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
