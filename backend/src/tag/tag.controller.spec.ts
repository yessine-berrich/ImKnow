import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
import { AuthGuard } from '../users/guards/auth.guard';
import { AuthRolesGuard } from '../users/guards/auth-roles.guard';

describe('TagController', () => {
  let controller: TagController;
  let service: jest.Mocked<TagService>;

  const mockTag = { id: 1, name: 'nestjs', articles: [] };

  const mockTagService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findOrCreateByNames: jest.fn(),
    suggestTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [{ provide: TagService, useValue: mockTagService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthRolesGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TagController>(TagController);
    service = module.get(TagService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all tags', async () => {
      mockTagService.findAll.mockResolvedValue([mockTag]);

      const result = await controller.findAll();

      expect(result).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one tag', async () => {
      mockTagService.findOne.mockResolvedValue(mockTag);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockTag);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create a tag', async () => {
      const dto = { name: 'typescript' };
      mockTagService.create.mockResolvedValue({ id: 2, ...dto });

      const result = await controller.create(dto as any);

      expect(result).toBeDefined();
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update a tag', async () => {
      const dto = { name: 'updated' };
      mockTagService.update.mockResolvedValue({ ...mockTag, ...dto });

      const result = await controller.update(1, dto as any);

      expect(service.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('remove', () => {
    it('should remove a tag', async () => {
      mockTagService.remove.mockResolvedValue(undefined);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });
});
