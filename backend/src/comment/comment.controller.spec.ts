import { Test, TestingModule } from '@nestjs/testing';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { AuthGuard } from '../users/guards/auth.guard';

describe('CommentController', () => {
  let controller: CommentController;
  let service: jest.Mocked<CommentService>;

  const mockCommentService = {
    create: jest.fn(),
    findAllByArticle: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleLike: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentController],
      providers: [{ provide: CommentService, useValue: mockCommentService }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CommentController>(CommentController);
    service = module.get(CommentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
