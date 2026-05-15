import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { NotificationType } from 'utils/constants';

// ── Mock external dependencies before any imports resolve them ─────────────

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: (...args: any[]) => mockCreateTransport(...args),
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('<html><%- link %></html>'),
}));

jest.mock('ejs', () => ({
  render: jest.fn().mockReturnValue('<html>rendered</html>'),
}));

// ───────────────────────────────────────────────────────────────────────────

describe('MailService', () => {
  let service: MailService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        EMAIL_HOST: 'smtp.test.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'password123',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    service.onModuleInit(); // Initialize the nodemailer transporter
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore readFileSync mock after each test
    const fs = require('fs');
    fs.readFileSync.mockReturnValue('<html><%- link %></html>');
    const ejs = require('ejs');
    ejs.render.mockReturnValue('<html>rendered</html>');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize transporter on module init', () => {
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'test@example.com', pass: 'password123' },
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendVerifyEmailTemplate
  // ═══════════════════════════════════════════════════════════════

  describe('sendVerifyEmailTemplate', () => {
    it('should render template and send verification email', async () => {
      await service.sendVerifyEmailTemplate('user@example.com', 'https://verify-link');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Vérifiez votre adresse email',
          html: '<html>rendered</html>',
        }),
      );
    });

    it('should use ejs to render the template', async () => {
      const ejs = require('ejs');
      await service.sendVerifyEmailTemplate('user@example.com', 'https://verify-link');

      expect(ejs.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ link: 'https://verify-link' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendResetPasswordTemplate
  // ═══════════════════════════════════════════════════════════════

  describe('sendResetPasswordTemplate', () => {
    it('should send reset password email', async () => {
      await service.sendResetPasswordTemplate('user@example.com', 'https://reset-link');

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Réinitialisation de mot de passe',
        }),
      );
    });

    it('should render template with resetPasswordLink context', async () => {
      const ejs = require('ejs');
      await service.sendResetPasswordTemplate('user@example.com', 'https://reset-link');

      expect(ejs.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ resetPasswordLink: 'https://reset-link' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendEmailChangeConfirmation
  // ═══════════════════════════════════════════════════════════════

  describe('sendEmailChangeConfirmation', () => {
    it('should send email change confirmation to current email', async () => {
      await service.sendEmailChangeConfirmation(
        'current@example.com',
        'https://confirm-link',
        'Alice',
        'new@example.com',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'current@example.com',
          subject: 'Confirm your email address change',
        }),
      );
    });

    it('should render template with correct context', async () => {
      const ejs = require('ejs');
      await service.sendEmailChangeConfirmation(
        'current@example.com',
        'https://confirm-link',
        'Alice',
        'new@example.com',
      );

      expect(ejs.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          firstName: 'Alice',
          confirmLink: 'https://confirm-link',
          newEmail: 'new@example.com',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendDeleteAccountConfirmationEmail
  // ═══════════════════════════════════════════════════════════════

  describe('sendDeleteAccountConfirmationEmail', () => {
    it('should send account deletion confirmation email', async () => {
      await service.sendDeleteAccountConfirmationEmail(
        'user@example.com',
        'https://delete-confirm',
        'Bob',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Confirm Account Deletion',
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // sendNotificationEmail
  // ═══════════════════════════════════════════════════════════════

  describe('sendNotificationEmail', () => {
    it('should do nothing when recipient is missing', async () => {
      await service.sendNotificationEmail('', NotificationType.NEW_COMMENT, 'test');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should send ARTICLE_PUBLISHED notification', async () => {
      await service.sendNotificationEmail(
        'author@example.com',
        NotificationType.ARTICLE_PUBLISHED,
        'Article published',
        { articleId: 1 },
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'author@example.com',
          subject: 'Votre article a été publié',
        }),
      );
    });

    it('should send ARTICLE_REJECTED notification', async () => {
      await service.sendNotificationEmail(
        'author@example.com',
        NotificationType.ARTICLE_REJECTED,
        'Article rejected',
        { rejectionReason: 'Inappropriate content' },
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'author@example.com',
          subject: 'Votre article a été rejeté',
        }),
      );
    });

    it('should send ARTICLE_PENDING_MODERATION notification', async () => {
      await service.sendNotificationEmail(
        'author@example.com',
        NotificationType.ARTICLE_PENDING_MODERATION,
        'Pending review',
        { articleId: 1 },
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Votre article est en attente de modération",
        }),
      );
    });

    it('should send USER_ROLE_CHANGED notification', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.USER_ROLE_CHANGED,
        'Role changed',
        { oldRole: 'employee', newRole: 'ADMIN' },
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Votre rôle a été modifié' }),
      );
    });

    it('should send ACCOUNT_ACTIVATED notification', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.ACCOUNT_ACTIVATED,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Votre compte a été activé' }),
      );
    });

    it('should send ACCOUNT_DEACTIVATED notification', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.ACCOUNT_DEACTIVATED,
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Votre compte a été désactivé' }),
      );
    });

    it('should send SYSTEM_ERROR notification', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.SYSTEM_ERROR,
        'System error occurred',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Erreur système' }),
      );
    });

    it('should send SYSTEM_INFO notification', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.SYSTEM_INFO,
        'System info',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Information système' }),
      );
    });

    it('should use generic subject for unknown notification types', async () => {
      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.NEW_COMMENT,
        'Someone commented',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: expect.stringContaining('Notification') }),
      );
    });

    it('should include sender name in context', async () => {
      const ejs = require('ejs');
      const mockSender = { firstName: 'John', lastName: 'Doe' } as any;

      await service.sendNotificationEmail(
        'user@example.com',
        NotificationType.NEW_COMMENT,
        'John commented',
        {},
        mockSender,
      );

      expect(ejs.render).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ senderName: 'John Doe' }),
      );
    });

    it('should not throw when sendMail fails internally', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      await expect(
        service.sendNotificationEmail('user@example.com', NotificationType.NEW_COMMENT),
      ).resolves.not.toThrow();
    });
  });
});
