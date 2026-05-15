import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationGateway],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('sendToUser', () => {
    it('should send a notification to a connected user via room', () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockServer = { to: mockTo };
      (gateway as any).server = mockServer;
      (gateway as any).connectedUsers.set(1, 'socket-id-1');

      gateway.sendToUser(1, { type: 'comment', message: 'New comment' });

      expect(mockTo).toHaveBeenCalledWith('user_1');
      expect(mockEmit).toHaveBeenCalledWith('new_notification', { type: 'comment', message: 'New comment' });
    });

    it('should not emit when user is not connected (no socket)', () => {
      const mockEmit = jest.fn();
      const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
      const mockServer = { to: mockTo };
      (gateway as any).server = mockServer;
      (gateway as any).connectedUsers.clear();

      gateway.sendToUser(999, { type: 'comment', message: 'New comment' });

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });
});
