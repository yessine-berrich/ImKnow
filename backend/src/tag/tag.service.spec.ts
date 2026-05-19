import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagService } from './tag.service';
import { Tag } from './entities/tag.entity';
import { NotFoundException } from '@nestjs/common';

jest.mock('ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({
    chat: jest.fn(),
  })),
}));

describe('TagService', () => {
  let service: TagService;
  let tagRepository: jest.Mocked<Repository<Tag>>;

  const mockTag: Partial<Tag> = {
    id: 1,
    name: 'nestjs',
    publications: [],
  };

  const mockTagRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagService,
        { provide: getRepositoryToken(Tag), useValue: mockTagRepo },
      ],
    }).compile();

    service = module.get<TagService>(TagService);
    tagRepository = module.get(getRepositoryToken(Tag));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all tags ordered by name', async () => {
      mockTagRepo.find.mockResolvedValue([mockTag]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(mockTagRepo.find).toHaveBeenCalledWith({
        relations: ['publications'],
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a tag by id', async () => {
      mockTagRepo.findOne.mockResolvedValue(mockTag);

      const result = await service.findOne(1);

      expect(result).toEqual(mockTag);
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockTagRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a new tag', async () => {
      const dto = { name: 'typescript' };
      mockTagRepo.findOne.mockResolvedValue(null);
      mockTagRepo.create.mockReturnValue({ ...dto, id: 2 } as any);
      mockTagRepo.save.mockResolvedValue({ ...dto, id: 2 } as any);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockTagRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const dto = { name: 'updated-tag' };
      mockTagRepo.findOne.mockResolvedValue(mockTag);
      mockTagRepo.save.mockResolvedValue({ ...mockTag, ...dto } as any);

      const result = await service.update(1, dto);

      expect(mockTagRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockTagRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: 'new' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a tag', async () => {
      mockTagRepo.findOne.mockResolvedValue(mockTag);
      mockTagRepo.remove.mockResolvedValue(mockTag as any);

      await service.remove(1);

      expect(mockTagRepo.remove).toHaveBeenCalledWith(mockTag);
    });

    it('should throw NotFoundException if tag not found', async () => {
      mockTagRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});
