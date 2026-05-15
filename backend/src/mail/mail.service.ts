import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import * as ejs from 'ejs';
import { User } from 'src/users/entities/user.entity';
import { NotificationType } from 'utils/constants';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('EMAIL_HOST'),
      port: this.config.get<number>('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.config.get<string>('EMAIL_USER'),
        pass: this.config.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  // ── Template renderer ─────────────────────────────────────────────────────

  private renderTemplate(templateName: string, context: Record<string, any>): string {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.ejs`);
    const template = fs.readFileSync(templatePath, 'utf-8');
    return ejs.render(template, context);
  }

  private async send(options: nodemailer.SendMailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: `"ImKnow" <${this.config.get('EMAIL_USER')}>`,
      ...options,
    });
  }

  // ── Public methods ────────────────────────────────────────────────────────

  public async sendVerifyEmailTemplate(email: string, link: string): Promise<void> {
    const html = this.renderTemplate('verify-email', { link });
    await this.send({ to: email, subject: 'Vérifiez votre adresse email', html });
  }

  public async sendResetPasswordTemplate(email: string, resetPasswordLink: string): Promise<void> {
    const html = this.renderTemplate('reset-password', { resetPasswordLink });
    await this.send({ to: email, subject: 'Réinitialisation de mot de passe', html });
  }

  /**
   * Step 1 of the email-change flow.
   * Sent to the user's CURRENT address — they must click to confirm.
   */
  public async sendEmailChangeConfirmation(
    currentEmail: string,
    confirmLink: string,
    firstName: string,
    newEmail: string,
  ): Promise<void> {
    const html = this.renderTemplate('email-change-confirmation', {
      firstName,
      confirmLink,
      newEmail,
      year: new Date().getFullYear(),
    });

    await this.send({
      to: currentEmail,
      subject: 'Confirm your email address change',
      html,
    });
  }

  public async sendDeleteAccountConfirmationEmail(
    email: string,
    confirmationLink: string,
    firstName: string,
  ): Promise<void> {
    const html = this.renderTemplate('delete-account-confirmation', {
      firstName,
      confirmationLink,
      year: new Date().getFullYear(),
    });

    await this.send({ to: email, subject: 'Confirm Account Deletion', html });
  }

  public async sendNotificationEmail(
    to: string,
    type: NotificationType,
    message?: string,
    data: Record<string, any> = {},
    sender?: User | null,
  ): Promise<void> {
    try {
      if (!to || !type) {
        console.warn('sendNotificationEmail: Missing required parameters');
        return;
      }

      let subject = 'Notification';
      let context: Record<string, any> = {
        message,
        senderName: sender
          ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Quelqu\'un'
          : 'La plateforme',
        year: new Date().getFullYear(),
      };

      switch (type) {
        case NotificationType.ARTICLE_PUBLISHED:
          subject = 'Votre article a été publié';
          context = {
            ...context,
            articleTitle: data.articleTitle || 'votre article',
            articleUrl: this.buildArticleUrl(data),
            moderationScore: data.moderationScore,
          };
          break;

        case NotificationType.ARTICLE_PENDING_MODERATION:
          subject = 'Votre article est en attente de modération';
          context = {
            ...context,
            articleTitle: data.articleTitle || 'votre article',
            articleUrl: this.buildArticleUrl(data),
            moderationScore: data.moderationScore,
            message: message || 'Votre article nécessite une vérification manuelle',
          };
          break;

        case NotificationType.ARTICLE_REJECTED:
          subject = 'Votre article a été rejeté';
          context = {
            ...context,
            articleTitle: data.articleTitle || 'votre article',
            rejectionReason: data.rejectionReason || message || 'Contenu inapproprié',
            duplicateScore: data.duplicateScore,
            similarArticles: data.similarArticles,
          };
          break;

        case NotificationType.USER_ROLE_CHANGED:
          subject = 'Votre rôle a été modifié';
          context = {
            ...context,
            oldRole: data.oldRole,
            newRole: data.newRole || 'utilisateur',
            message: message || `Votre rôle a été changé en ${data.newRole || 'utilisateur'}`,
          };
          break;

        case NotificationType.ACCOUNT_ACTIVATED:
          subject = 'Votre compte a été activé';
          context = {
            ...context,
            accountActivated: true,
            message: message || 'Votre compte a été activé. Vous pouvez maintenant accéder à la plateforme.',
          };
          break;

        case NotificationType.ACCOUNT_DEACTIVATED:
          subject = 'Votre compte a été désactivé';
          context = {
            ...context,
            accountDeactivated: true,
            message: message || "Votre compte a été désactivé. Contactez un administrateur pour plus d'informations.",
          };
          break;

        case NotificationType.SYSTEM_INFO:
        case NotificationType.SYSTEM_ERROR:
          subject = type === NotificationType.SYSTEM_ERROR ? 'Erreur système' : 'Information système';
          context = {
            ...context,
            systemMessage: message || data.systemMessage || 'Une information importante vous concerne',
          };
          break;

        default:
          subject = `Notification - ${type}`;
          break;
      }

      const html = this.renderTemplate('notification-default', context);
      await this.send({ to, subject, html });
    } catch (error) {
      console.error(`Erreur envoi notification email (${type}):`, error);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildArticleUrl(data: Record<string, any>): string {
    if (data.articleUrl) return data.articleUrl;
    if (data.articleSlug) return `${process.env.CLIENT_DOMAIN}/articles/${data.articleSlug}`;
    if (data.articleId) return `${process.env.CLIENT_DOMAIN}/articles/${data.articleId}`;
    return '#';
  }
}