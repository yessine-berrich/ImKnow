import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { AvatarUploadService } from './avatar-upload.service';
import { SessionService } from '../session/session.service';
import { ConfigService } from '@nestjs/config';
import { userRole } from 'utils/constants';
import { ForbiddenException, CanActivate } from '@nestjs/common';
import { AuthGuard } from './guards/auth.guard';
import { ActiveUserGuard } from './guards/active-user.guard';
import { AuthRolesGuard } from './guards/auth-roles.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  const mockUser = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    role: userRole.EMPLOYEE,
    isActive: true,
  };

  const mockPayload = {
    sub: 1,
    email: 'john@example.com',
    role: userRole.EMPLOYEE,
  };

  // Mock guards
  const mockAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };
  const mockActiveUserGuard: CanActivate = { canActivate: jest.fn(() => true) };
  const mockAuthRolesGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const mockUsersService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      getCurrentUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      changeUserRole: jest.fn(),
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      verifyEmail: jest.fn(),
      sendResetPassword: jest.fn(),
      getResetPassword: jest.fn(),
      resetPassword: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      searchUsers: jest.fn(),
      changePassword: jest.fn(),
      updateNotificationPreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: { register: jest.fn(), login: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test') } },
        { provide: SessionService, useValue: { createSession: jest.fn(), revokeSession: jest.fn() } },
        { provide: AvatarUploadService, useValue: { processUploadedFile: jest.fn().mockResolvedValue('/uploads/profile.webp'), deleteOldAvatar: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(ActiveUserGuard)
      .useValue(mockActiveUserGuard)
      .overrideGuard(AuthRolesGuard)
      .useValue(mockAuthRolesGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const createUserDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123',
      };
      const expectedResult = { id: 2, ...createUserDto };
      service.register.mockResolvedValue(expectedResult);

      const result = await controller.register(createUserDto as any);

      expect(result).toEqual(expectedResult);
      expect(service.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      const loginDto = { email: 'john@example.com', password: 'password123' };
      const expectedResult = { accessToken: 'token123' };
      service.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto as any, 'Mozilla/5.0', { ip: '127.0.0.1' });

      expect(result).toEqual(expectedResult);
      expect(service.login).toHaveBeenCalledWith(loginDto, { userAgent: 'Mozilla/5.0', ipAddress: '127.0.0.1' });
    });
  });

  describe('logout', () => {
    it('should logout a user', async () => {
      const expectedResult = { message: 'Logged out successfully' };
      service.logout.mockResolvedValue(expectedResult);

      const result = await controller.logout(mockPayload as any, 'Bearer some-token');

      expect(result).toEqual(expectedResult);
      expect(service.logout).toHaveBeenCalledWith(1, 'some-token');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user', async () => {
      service.getCurrentUser.mockResolvedValue(mockUser);

      const result = await controller.getCurrentUser(mockPayload as any);

      expect(result).toEqual(mockUser);
      expect(service.getCurrentUser).toHaveBeenCalledWith(1);
    });
  });

  describe('activate', () => {
    it('should activate a user', async () => {
      const expectedResult = { message: 'User activated' };
      service.activateUser.mockResolvedValue(expectedResult);

      const result = await controller.activate(2);

      expect(result).toEqual(expectedResult);
      expect(service.activateUser).toHaveBeenCalledWith(2);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      const expectedResult = { message: 'User deactivated' };
      service.deactivateUser.mockResolvedValue(expectedResult);

      const result = await controller.deactivate(2);

      expect(result).toEqual(expectedResult);
      expect(service.deactivateUser).toHaveBeenCalledWith(2);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      const expectedResult = { message: 'Role updated' };
      service.changeUserRole.mockResolvedValue(expectedResult);

      const result = await controller.updateRole(2, userRole.ADMIN, mockPayload as any);

      expect(result).toEqual(expectedResult);
      expect(service.changeUserRole).toHaveBeenCalledWith(1, 2, userRole.ADMIN);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const dto = { emailNotificationsEnabled: false };
      const expectedResult = { message: 'Preferences updated' };
      service.updateNotificationPreferences.mockResolvedValue(expectedResult);

      const result = await controller.updateNotificationPreferences(mockPayload as any, dto as any);

      expect(result).toEqual(expectedResult);
      expect(service.updateNotificationPreferences).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('getAllUsers', () => {
    it('should get all users', async () => {
      service.getAllUsers.mockResolvedValue([mockUser]);

      const result = await controller.getAllUsers();

      expect(result).toEqual([mockUser]);
      expect(service.getAllUsers).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      service.getUserById.mockResolvedValue(mockUser);

      const result = await controller.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(service.getUserById).toHaveBeenCalledWith(1);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const expectedResult = { message: 'Email verified' };
      service.verifyEmail.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(1, 'verification-token');

      expect(result).toEqual(expectedResult);
      expect(service.verifyEmail).toHaveBeenCalledWith(1, 'verification-token');
    });
  });

  describe('forgotPassword', () => {
    it('should send forgot password email', async () => {
      const dto = { email: 'john@example.com' };
      const expectedResult = { message: 'Reset email sent' };
      service.sendResetPassword.mockResolvedValue(expectedResult);

      const result = await controller.forgotPassword(dto as any);

      expect(result).toEqual(expectedResult);
      expect(service.sendResetPassword).toHaveBeenCalledWith('john@example.com');
    });
  });

  describe('getResetPassword', () => {
    it('should get reset password link', async () => {
      const expectedResult = { message: 'Valid link' };
      service.getResetPassword.mockResolvedValue(expectedResult);

      const result = await controller.getResetPassword(1, 'reset-token');

      expect(result).toEqual(expectedResult);
      expect(service.getResetPassword).toHaveBeenCalledWith(1, 'reset-token');
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      const dto = { userId: 1, token: 'token', newPassword: 'newpass' };
      const expectedResult = { message: 'Password reset' };
      service.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(dto as any);

      expect(result).toEqual(expectedResult);
      expect(service.resetPassword).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updateDto = { firstName: 'Jane' };
      const expectedResult = { ...mockUser, ...updateDto };
      service.update.mockResolvedValue(expectedResult);
      service.getUserById.mockResolvedValue(mockUser);

      const result = await controller.update(1 as any, updateDto as any, undefined as any, mockPayload as any);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw ForbiddenException when updating another user without admin role', async () => {
      const updateDto = { firstName: 'Jane' };

      await expect(
        controller.update(2 as any, updateDto as any, undefined as any, mockPayload as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      const expectedResult = { message: 'User deleted' };
      service.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(1);

      expect(result).toEqual(expectedResult);
      expect(service.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('search', () => {
    it('should search users', async () => {
      service.searchUsers.mockResolvedValue([mockUser]);

      const result = await controller.search('John');

      expect(result).toEqual([mockUser]);
      expect(service.searchUsers).toHaveBeenCalledWith('John');
    });
  });

  describe('changePassword', () => {
    it('should change password for self', async () => {
      const dto = { currentPassword: 'old', newPassword: 'new' };
      const expectedResult = { message: 'Password changed' };
      service.changePassword.mockResolvedValue(expectedResult);

      const result = await controller.changePassword(1, dto as any, mockPayload as any);

      expect(result).toEqual(expectedResult);
      expect(service.changePassword).toHaveBeenCalledWith(1, dto);
    });

    it('should allow admin to change other user password', async () => {
      const adminPayload = { ...mockPayload, role: userRole.ADMIN };
      const dto = { currentPassword: 'old', newPassword: 'new' };
      const expectedResult = { message: 'Password changed' };
      service.changePassword.mockResolvedValue(expectedResult);

      const result = await controller.changePassword(2, dto as any, adminPayload as any);

      expect(result).toEqual(expectedResult);
      expect(service.changePassword).toHaveBeenCalledWith(2, dto);
    });

    it('should throw ForbiddenException when changing other user password without admin role', async () => {
      const dto = { currentPassword: 'old', newPassword: 'new' };

      await expect(controller.changePassword(2, dto as any, mockPayload as any))
        .rejects.toThrow(ForbiddenException);
    });
  });
});
