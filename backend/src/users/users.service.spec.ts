import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserReport } from './entities/user-report.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { SessionService } from '../session/session.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { userRole } from 'utils/constants';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashedPassword',
    phone: undefined as unknown as string,
    bio: undefined as unknown as string,
    department: undefined as unknown as string,
    country: undefined as unknown as string,
    city: undefined as unknown as string,
    state: undefined as unknown as string,
    postalCode: undefined as unknown as string,
    facebook: undefined as unknown as string,
    twitter: undefined as unknown as string,
    linkedin: undefined as unknown as string,
    instagram: undefined as unknown as string,
    profileImage: undefined as unknown as string,
    role: userRole.EMPLOYEE,
    isActive: true,
    status: true,
    isOnline: false,
    lastSeenAt: undefined as unknown as Date,
    verificationToken: undefined as unknown as string,
    resetPasswordToken: undefined as unknown as string,
    emailNotificationsEnabled: true,
    emailOnComment: true,
    emailOnLike: false,
    emailOnNewFollower: true,
    emailNewsletter: false,
    pushNotificationsEnabled: true,
    publications: [],
    comments: [],
    likedComments: [],
    likedPublications: [],
    bookmarkedPublications: [],
    notifications: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      preload: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };

    const mockAuthService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
      changeUserRole: jest.fn(),
      sendResetPasswordLink: jest.fn(),
      getResetPasswordLink: jest.fn(),
      resetPassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserReport),
          useValue: { create: jest.fn(), save: jest.fn(), findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: SessionService,
          useValue: { revokeAllUserSessions: jest.fn(), createSession: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-value') },
        },
        {
          provide: MailService,
          useValue: { sendMail: jest.fn(), sendNotificationEmail: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.getCurrentUser(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return a user by id', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(1);

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 }, relations: ['publications'] });
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users with publications', async () => {
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.getAllUsers();

      expect(result).toEqual([mockUser]);
      expect(userRepository.find).toHaveBeenCalledWith({
        relations: ['publications'],
      });
    });
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const createUserDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'password123',
      };
      const expectedResult = { id: 2, ...createUserDto };
      authService.register.mockResolvedValue(expectedResult as any);

      const result = await service.register(createUserDto as any);

      expect(result).toEqual(expectedResult);
      expect(authService.register).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('login', () => {
    it('should call authService.login with context', async () => {
      const loginDto = { email: 'john@example.com', password: 'password123' };
      const context = { userAgent: 'Mozilla/5.0', ipAddress: '127.0.0.1' };
      const expectedResult = { accessToken: 'token123' };
      authService.login.mockResolvedValue(expectedResult as any);

      const result = await service.login(loginDto as any, context);

      expect(result).toEqual(expectedResult);
      expect(authService.login).toHaveBeenCalledWith(loginDto, context);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with userId and rawToken', async () => {
      const expectedResult = { message: 'Logged out successfully' };
      authService.logout.mockResolvedValue(expectedResult as any);

      const result = await service.logout(1, 'raw-token');

      expect(result).toEqual(expectedResult);
      expect(authService.logout).toHaveBeenCalledWith(1, 'raw-token');
    });
  });

  describe('activateUser', () => {
    it('should call authService.activateUser', async () => {
      const expectedResult = { message: 'User activated' };
      authService.activateUser.mockResolvedValue(expectedResult as any);

      const result = await service.activateUser(1);

      expect(result).toEqual(expectedResult);
      expect(authService.activateUser).toHaveBeenCalledWith(1);
    });
  });

  describe('deactivateUser', () => {
    it('should call authService.deactivateUser', async () => {
      const expectedResult = { message: 'User deactivated' };
      authService.deactivateUser.mockResolvedValue(expectedResult as any);

      const result = await service.deactivateUser(1);

      expect(result).toEqual(expectedResult);
      expect(authService.deactivateUser).toHaveBeenCalledWith(1);
    });
  });

  describe('changeUserRole', () => {
    it('should call authService.changeUserRole', async () => {
      const expectedResult = { message: 'Role changed' };
      authService.changeUserRole.mockResolvedValue(expectedResult as any);

      const result = await service.changeUserRole(1, 2, userRole.ADMIN);

      expect(result).toEqual(expectedResult);
      expect(authService.changeUserRole).toHaveBeenCalledWith(1, 2, userRole.ADMIN);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const userWithToken = { ...mockUser, verificationToken: 'valid-token' as any, isActive: false };
      userRepository.findOne.mockResolvedValue(userWithToken);
      userRepository.save.mockResolvedValue({ ...userWithToken, isActive: true, verificationToken: null as any } as any);

      const result = await service.verifyEmail(1, 'valid-token');

      expect(result.message).toBe('Your email has been verified, please log in to your account');
      expect(userRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail(1, 'token')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no verification token exists', async () => {
      const userWithoutToken = { ...mockUser, verificationToken: null as any };
      userRepository.findOne.mockResolvedValue(userWithoutToken);

      await expect(service.verifyEmail(1, 'token')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if token is invalid', async () => {
      const userWithToken = { ...mockUser, verificationToken: 'different-token' as any };
      userRepository.findOne.mockResolvedValue(userWithToken);

      await expect(service.verifyEmail(1, 'invalid-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendResetPassword', () => {
    it('should call authService.sendResetPasswordLink', async () => {
      const expectedResult = { message: 'Reset password email sent' };
      authService.sendResetPasswordLink.mockResolvedValue(expectedResult as any);

      const result = await service.sendResetPassword('john@example.com');

      expect(result).toEqual(expectedResult);
      expect(authService.sendResetPasswordLink).toHaveBeenCalledWith('john@example.com');
    });
  });

  describe('getResetPassword', () => {
    it('should call authService.getResetPasswordLink', async () => {
      const expectedResult = { message: 'Valid reset link' };
      authService.getResetPasswordLink.mockResolvedValue(expectedResult as any);

      const result = await service.getResetPassword(1, 'reset-token');

      expect(result).toEqual(expectedResult);
      expect(authService.getResetPasswordLink).toHaveBeenCalledWith(1, 'reset-token');
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const resetPasswordDto = { userId: 1, token: 'token', newPassword: 'newpass' };
      const expectedResult = { message: 'Password reset successfully' };
      authService.resetPassword.mockResolvedValue(expectedResult as any);

      const result = await service.resetPassword(resetPasswordDto as any);

      expect(result).toEqual(expectedResult);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updateData = { firstName: 'Jane' };
      const updatedUser = { ...mockUser, ...updateData };
      userRepository.preload.mockResolvedValue(updatedUser);
      userRepository.save.mockResolvedValue(updatedUser);

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedUser);
      expect(userRepository.preload).toHaveBeenCalledWith({ id: 1, ...updateData });
      expect(userRepository.save).toHaveBeenCalledWith(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.preload.mockResolvedValue(null);

      await expect(service.update(999, { firstName: 'Jane' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a user successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove(1);

      expect(result.message).toBe('User with ID 1 has been successfully deleted');
      expect(userRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchUsers', () => {
    it('should return users matching query', async () => {
      userRepository.find.mockResolvedValue([mockUser]);

      const result = await service.searchUsers('John');

      expect(result).toEqual([mockUser]);
    });

    it('should return empty array if query is too short', async () => {
      const result = await service.searchUsers('J');

      expect(result).toEqual([]);
      expect(userRepository.find).not.toHaveBeenCalled();
    });

    it('should return empty array if query is empty', async () => {
      const result = await service.searchUsers('');

      expect(result).toEqual([]);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userWithPassword = { ...mockUser, password: 'hashedPassword' };
      userRepository.findOne.mockResolvedValue(userWithPassword);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      userRepository.save.mockResolvedValue({ ...userWithPassword, password: 'newHashedPassword' });

      const result = await service.changePassword(1, {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword',
      } as any);

      expect(result.message).toBe('Password changed successfully. Please log in again.');
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPassword', 'hashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.changePassword(1, {
        currentPassword: 'old',
        newPassword: 'new',
      } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword',
      } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.updateNotificationPreferences(1, {
        emailNotificationsEnabled: false,
        emailOnComment: false,
      } as any);

      expect(result.message).toBe('Notification preferences updated successfully');
      expect(userRepository.update).toHaveBeenCalledWith(1, {
        emailNotificationsEnabled: false,
        emailOnComment: false,
      });
    });
  });

  describe('findByNames', () => {
    it('should return empty array if mentions is empty', async () => {
      const result = await service.findByNames([]);

      expect(result).toEqual([]);
    });

    it('should find users by names', async () => {
      const queryBuilderMock = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockUser]),
      };
      userRepository.createQueryBuilder.mockReturnValue(queryBuilderMock as any);

      const result = await service.findByNames([{ firstName: 'John', lastName: 'Doe' }]);

      expect(result).toEqual([mockUser]);
      expect(queryBuilderMock.where).toHaveBeenCalled();
    });
  });
});
