import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { Notification } from '../notification/entities/notification.entity';
import { NotificationType } from 'utils/constants';
import { NotificationService } from '../notification/notification.service';
import { seedUsers } from './seed-users';
import { seedPublications } from './seed-publications';

const logger = new Logger('Seed:Notifications');

interface NotificationData {
  recipientEmail: string;
  senderEmail?: string;
  type: NotificationType;
  message: string;
  data?: Record<string, any>;
}

const NOTIFICATIONS: NotificationData[] = [
  // Notifications de follow
  { recipientEmail: 'julien.leroy@imknow.com',   senderEmail: 'thomas.martin@imknow.com',  type: NotificationType.NEW_FOLLOWER,         message: 'Thomas Martin a commencé à vous suivre.' },
  { recipientEmail: 'marie.dupont@imknow.com',    senderEmail: 'emma.moreau@imknow.com',    type: NotificationType.NEW_FOLLOWER,         message: 'Emma Moreau a commencé à vous suivre.' },
  { recipientEmail: 'nicolas.mercier@imknow.com', senderEmail: 'julien.leroy@imknow.com',   type: NotificationType.NEW_FOLLOWER,         message: 'Julien Leroy a commencé à vous suivre.' },

  // Notifications de like sur publication
  { recipientEmail: 'thomas.martin@imknow.com',   senderEmail: 'alexandre.petit@imknow.com', type: NotificationType.PUBLICATION_LIKED,    message: 'Alexandre Petit a aimé votre publication "Guide complet React 18".',      data: { publicationId: null } },
  { recipientEmail: 'alexandre.petit@imknow.com', senderEmail: 'julien.leroy@imknow.com',    type: NotificationType.PUBLICATION_LIKED,    message: 'Julien Leroy a aimé votre publication "TypeScript avancé".',               data: { publicationId: null } },
  { recipientEmail: 'nicolas.mercier@imknow.com', senderEmail: 'thomas.martin@imknow.com',   type: NotificationType.PUBLICATION_LIKED,    message: 'Thomas Martin a aimé votre publication "Clean Architecture en NestJS".',   data: { publicationId: null } },

  // Notifications de commentaire
  { recipientEmail: 'thomas.martin@imknow.com',   senderEmail: 'alexandre.petit@imknow.com', type: NotificationType.NEW_COMMENT,          message: 'Alexandre Petit a commenté votre article "Guide complet React 18".',      data: { publicationId: null } },
  { recipientEmail: 'lucas.bernard@imknow.com',   senderEmail: 'julien.leroy@imknow.com',    type: NotificationType.NEW_COMMENT,          message: 'Julien Leroy a commenté votre article "Sécurité des API REST".',           data: { publicationId: null } },
  { recipientEmail: 'nicolas.mercier@imknow.com', senderEmail: 'julien.leroy@imknow.com',    type: NotificationType.NEW_COMMENT,          message: 'Julien Leroy a commenté votre article "Clean Architecture en NestJS".',    data: { publicationId: null } },

  // Notifications de like sur commentaire
  { recipientEmail: 'alexandre.petit@imknow.com', senderEmail: 'sophie.laurent@imknow.com',  type: NotificationType.COMMENT_LIKED,        message: 'Sophie Laurent a aimé votre commentaire sur "Guide complet React 18".' },
  { recipientEmail: 'sophie.laurent@imknow.com',  senderEmail: 'emma.moreau@imknow.com',     type: NotificationType.COMMENT_LIKED,        message: 'Emma Moreau a aimé votre commentaire sur "Intelligence Artificielle".' },

  // Notifications de mention
  { recipientEmail: 'alexandre.petit@imknow.com', senderEmail: 'julien.leroy@imknow.com',    type: NotificationType.MENTION,              message: 'Julien Leroy vous a mentionné dans un commentaire sur "TypeScript avancé".' },
  { recipientEmail: 'marie.dupont@imknow.com',    senderEmail: 'julien.leroy@imknow.com',    type: NotificationType.MENTION,              message: 'Julien Leroy vous a mentionné dans un commentaire sur "Onboarding réussi".' },

  // Notifications système
  { recipientEmail: 'marie.dupont@imknow.com',                                                type: NotificationType.ACCOUNT_ACTIVATED,    message: 'Votre compte a été activé avec succès.' },
  { recipientEmail: 'thomas.martin@imknow.com',                                               type: NotificationType.PUBLICATION_PUBLISHED, message: 'Votre article "Guide complet React 18" a été publié.', data: { publicationId: null } },
  { recipientEmail: 'alexandre.petit@imknow.com',                                             type: NotificationType.PUBLICATION_REJECTED,  message: 'Votre article "Comment cracker Photoshop" a été rejeté (contenu non conforme).', data: { publicationId: null } },
  { recipientEmail: 'lea.dubois@imknow.com',                                                  type: NotificationType.PUBLICATION_PENDING_MODERATION, message: 'Votre article "Pourquoi les microservices c\'est de la merde" est en attente de modération.', data: { publicationId: null } },
];

export async function seedNotifications(
  context?: INestApplicationContext,
  emailToUser?: Record<string, User>,
  titleToPub?: Record<string, Publication>,
): Promise<void> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  if (!emailToUser) {
    const result = await seedUsers(context);
    emailToUser = result.emailToUser;
  }

  const notificationRepo = context.get<Repository<Notification>>(getRepositoryToken(Notification));
  const notificationService = context.get(NotificationService);

  try {
    let notifCount = 0;
    for (const notif of NOTIFICATIONS) {
      const recipient = emailToUser[notif.recipientEmail];
      if (!recipient) {
        logger.warn(`  ⚠️ Destinataire non trouvé : ${notif.recipientEmail}`);
        continue;
      }

      const existing = await notificationRepo.findOne({
        where: { recipient: { id: recipient.id }, type: notif.type },
        order: { createdAt: 'DESC' },
      });
      if (existing) continue;

      const sender = notif.senderEmail ? (emailToUser[notif.senderEmail] ?? null) : null;

      try {
        await notificationService.createAndNotify(
          notif.type,
          recipient.id,
          sender,
          notif.message,
          notif.data,
        );
        notifCount++;
      } catch (err: any) {
        logger.warn(`  ⚠️ Notification: ${err.message}`);
      }
    }
    logger.log(`  ✅ ${notifCount} notifications`);
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedNotifications().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
