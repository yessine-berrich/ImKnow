// src/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, Not } from 'typeorm';
import {
  ChatMessage,
  MessageType,
  MessageRequestStatus,
} from './entities/chat-message.entity';
import { UserBlock } from './entities/user-block.entity';
import { ConversationSettings } from './entities/conversation-settings.entity';
import { User } from 'src/users/entities/user.entity';
import { Follow } from 'src/follow/entities/follow.entity';
import { FollowService } from 'src/follow/follow.service';
import {
  SendMessageDto,
  SearchMessagesDto,
  AddReactionDto,
  ForwardMessageDto,
  SendMessageRequestDto,
  MessageRequestResponseDto,
} from './dto/chat.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserBlock)
    private readonly userBlockRepository: Repository<UserBlock>,
    @InjectRepository(ConversationSettings)
    private readonly conversationSettingsRepository: Repository<ConversationSettings>,
    @Inject(forwardRef(() => FollowService))
    private readonly followService: FollowService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  generateConversationId(userId1: number, userId2: number): string {
    return [userId1, userId2].sort((a, b) => a - b).join('_');
  }

  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    // Primary: use followService when available (forwardRef proxy)
    try {
      if (this.followService) {
        return await this.followService.areFriends(userId1, userId2);
      }
    } catch (err) {
      this.logger.warn(`areFriends via followService failed (${err?.message}), falling back to direct query`);
    }

    // Fallback: query the follows table via the entity manager to avoid any
    // circular-dependency resolution issues at runtime.
    const followRepo = this.chatMessageRepository.manager.getRepository(Follow);
    const [ab, ba] = await Promise.all([
      followRepo.findOne({ where: { follower: { id: userId1 }, following: { id: userId2 } } }),
      followRepo.findOne({ where: { follower: { id: userId2 }, following: { id: userId1 } } }),
    ]);
    return !!ab && !!ba;
  }

  /**
   * Vérifie s'il existe une demande de contact acceptée entre deux utilisateurs
   */
  private async hasAcceptedRequest(userA: number, userB: number): Promise<boolean> {
    const req = await this.chatMessageRepository.findOne({
      where: [
        {
          sender: { id: userA },
          receiver: { id: userB },
          type: MessageType.MESSAGE_REQUEST,
          status: MessageRequestStatus.ACCEPTED,
        },
        {
          sender: { id: userB },
          receiver: { id: userA },
          type: MessageType.MESSAGE_REQUEST,
          status: MessageRequestStatus.ACCEPTED,
        },
      ],
    });
    return !!req;
  }

  /**
   * Vérifie s'il existe une demande non-refusée (pending ou accepted)
   * → permet d'ouvrir/voir la conversation.
   * Les demandes DECLINED sont exclues : après un refus, l'accès est coupé.
   */
  private async hasAnyRequest(userA: number, userB: number): Promise<boolean> {
    const req = await this.chatMessageRepository.findOne({
      where: [
        {
          sender: { id: userA },
          receiver: { id: userB },
          type: MessageType.MESSAGE_REQUEST,
          status: Not(MessageRequestStatus.DECLINED),
        },
        {
          sender: { id: userB },
          receiver: { id: userA },
          type: MessageType.MESSAGE_REQUEST,
          status: Not(MessageRequestStatus.DECLINED),
        },
      ],
    });
    return !!req;
  }

  /**
   * Vérifie si `fromId` a envoyé une demande en attente à `toId`
   */
  private async hasPendingRequestFrom(fromId: number, toId: number): Promise<boolean> {
    const req = await this.chatMessageRepository.findOne({
      where: {
        sender: { id: fromId },
        receiver: { id: toId },
        type: MessageType.MESSAGE_REQUEST,
        status: MessageRequestStatus.PENDING,
      },
    });
    return !!req;
  }

  /**
   * Deux utilisateurs peuvent ENVOYER des messages si :
   * - Aucun des deux n'a bloqué l'autre, ET
   * - Ils sont amis (mutual follow), OU
   * - Une demande de contact a été acceptée, OU
   * - Le destinataire répond à une demande en attente (réponse = acceptation), OU
   * - Ils ont un historique existant (ex-amis)
   */
  async canUsersChat(senderId: number, receiverId: number): Promise<boolean> {
    if (await this.isEitherBlocked(senderId, receiverId)) return false;
    if (await this.areFriends(senderId, receiverId)) return true;
    if (await this.hasAcceptedRequest(senderId, receiverId)) return true;
    if (await this.hasPendingRequestFrom(receiverId, senderId)) return true;
    return this.hasExistingConversation(senderId, receiverId);
  }

  private async isEitherBlocked(userA: number, userB: number): Promise<boolean> {
    const block = await this.userBlockRepository.findOne({
      where: [
        { blockerId: userA, blockedId: userB },
        { blockerId: userB, blockedId: userA },
      ],
    });
    return !!block;
  }

  /**
   * Retourne true si la conversation contient au moins un message réel envoyé
   * par un utilisateur (TEXT/IMAGE/FILE). Les messages système et les demandes
   * de contact sont exclus — un message système de refus ne doit pas ouvrir
   * l'accès à la messagerie.
   */
  private async hasExistingConversation(userA: number, userB: number): Promise<boolean> {
    const conversationId = this.generateConversationId(userA, userB);
    const count = await this.chatMessageRepository.count({
      where: [
        { conversationId, type: MessageType.TEXT },
        { conversationId, type: MessageType.IMAGE },
        { conversationId, type: MessageType.FILE },
      ],
    });
    return count > 0;
  }

  /**
   * Un utilisateur peut VOIR l'historique si :
   * - Ils sont amis, OU
   * - Une demande existe (pending/accepted), OU
   * - Une demande a été refusée (pour pouvoir la supprimer), OU
   * - Ils ont un historique de vrais messages (ex-amis)
   */
  async canUsersViewHistory(userId1: number, userId2: number): Promise<boolean> {
    if (!userId1 || !userId2 || isNaN(userId1) || isNaN(userId2)) {
      this.logger.warn(`canUsersViewHistory called with invalid ids: ${userId1}, ${userId2}`);
      return false;
    }
    const friends = await this.areFriends(userId1, userId2);
    this.logger.debug(`canUsersViewHistory(${userId1}, ${userId2}) → areFriends=${friends}`);
    if (friends) return true;
    if (await this.hasAnyRequest(userId1, userId2)) return true;
    if (await this.hasExistingConversation(userId1, userId2)) return true;
    // Demande refusée : on autorise la lecture pour que l'utilisateur
    // puisse voir le message de refus et supprimer la conversation.
    const declined = await this.chatMessageRepository.findOne({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 }, type: MessageType.MESSAGE_REQUEST, status: MessageRequestStatus.DECLINED },
        { sender: { id: userId2 }, receiver: { id: userId1 }, type: MessageType.MESSAGE_REQUEST, status: MessageRequestStatus.DECLINED },
      ],
    });
    return !!declined;
  }

  private async findUserOrFail(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // ─────────────────────────────────────────────────────────────
  // Demandes de contact — stockées dans ChatMessage
  // ─────────────────────────────────────────────────────────────

  async sendMessageRequest(
    senderId: number,
    receiverId: number,
    dto: SendMessageRequestDto,
  ): Promise<ChatMessage> {
    if (senderId === receiverId) {
      throw new BadRequestException('Vous ne pouvez pas vous envoyer une demande à vous-même');
    }

    await this.findUserOrFail(receiverId);

    if (await this.areFriends(senderId, receiverId)) {
      throw new BadRequestException('Vous êtes déjà amis — envoyez un message directement');
    }

    // Cherche une demande existante dans les deux sens
    const existing = await this.chatMessageRepository.findOne({
      where: [
        {
          sender: { id: senderId },
          receiver: { id: receiverId },
          type: MessageType.MESSAGE_REQUEST,
        },
        {
          sender: { id: receiverId },
          receiver: { id: senderId },
          type: MessageType.MESSAGE_REQUEST,
        },
      ],
    });

    if (existing) {
      if (existing.status === MessageRequestStatus.PENDING) {
        throw new ConflictException('Une demande est déjà en attente');
      }
      if (existing.status === MessageRequestStatus.ACCEPTED) {
        throw new ConflictException('La demande a déjà été acceptée');
      }
      // Si refusée → on permet de renvoyer
      existing.status = MessageRequestStatus.PENDING;
      existing.content = dto.introMessage ?? '';
      return this.chatMessageRepository.save(existing);
    }

    const conversationId = this.generateConversationId(senderId, receiverId);

    const request = this.chatMessageRepository.create({
      sender: { id: senderId } as User,
      receiver: { id: receiverId } as User,
      content: dto.introMessage ?? '',
      type: MessageType.MESSAGE_REQUEST,
      status: MessageRequestStatus.PENDING,
      conversationId,
      isRead: false,
      reactions: {},
    });

    return this.chatMessageRepository.save(request);
  }

  async respondToMessageRequest(
    userId: number,
    requestId: number,
    action: MessageRequestStatus.ACCEPTED | MessageRequestStatus.DECLINED,
  ): Promise<{ request: ChatMessage; systemMessage?: ChatMessage }> {
    const request = await this.chatMessageRepository.findOne({
      where: {
        id: requestId,
        receiver: { id: userId },
        type: MessageType.MESSAGE_REQUEST,
        status: MessageRequestStatus.PENDING,
      },
      relations: ['sender', 'receiver'],
    });

    if (!request) {
      throw new NotFoundException('Demande introuvable ou déjà traitée');
    }

    request.status = action;
    const saved = await this.chatMessageRepository.save(request);

    if (action === MessageRequestStatus.ACCEPTED) {
      await this.createSystemWelcomeMessage(request.sender.id, request.receiver.id);
      return { request: saved };
    }

    // DECLINED → notifier l'expéditeur via un message système
    const declineMsg = this.chatMessageRepository.create({
      sender: { id: request.receiver.id } as User,
      receiver: { id: request.sender.id } as User,
      content: `${request.receiver.firstName} a refusé votre demande de contact.`,
      type: MessageType.SYSTEM,
      conversationId: request.conversationId,
      isRead: false,
      reactions: {},
    });
    const systemMessage = await this.chatMessageRepository.save(declineMsg);

    return { request: saved, systemMessage };
  }

  /**
   * Crée un message système qui initialise la conversation
   * après qu'une amitié/acceptation est confirmée
   */
  async createSystemWelcomeMessage(
    userId1: number,
    userId2: number,
  ): Promise<ChatMessage> {
    const conversationId = this.generateConversationId(userId1, userId2);

    // Évite les doublons si déjà créé
    const existing = await this.chatMessageRepository.findOne({
      where: { conversationId, type: MessageType.SYSTEM },
    });
    if (existing) return existing;

    const welcome = this.chatMessageRepository.create({
      // sender null-safe : on utilise l'un des deux utilisateurs comme émetteur système
      sender: { id: userId1 } as User,
      receiver: { id: userId2 } as User,
      content: '👋 Vous êtes maintenant connectés ! Commencez à discuter.',
      type: MessageType.SYSTEM,
      conversationId,
      isRead: false,
      reactions: {},
    });

    return this.chatMessageRepository.save(welcome);
  }

  async getPendingMessageRequests(userId: number): Promise<MessageRequestResponseDto[]> {
    const requests = await this.chatMessageRepository.find({
      where: {
        receiver: { id: userId },
        type: MessageType.MESSAGE_REQUEST,
        status: MessageRequestStatus.PENDING,
      },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
      id: r.id,
      senderId: r.sender.id,
      senderName: `${r.sender.firstName} ${r.sender.lastName}`,
      senderProfileImage: r.sender.profileImage,
      introMessage: r.content || undefined,
      status: r.status!,
      createdAt: r.createdAt,
    }));
  }

  async getSentMessageRequests(userId: number): Promise<MessageRequestResponseDto[]> {
    const requests = await this.chatMessageRepository.find({
      where: {
        sender: { id: userId },
        type: MessageType.MESSAGE_REQUEST,
      },
      relations: ['receiver'],
      order: { createdAt: 'DESC' },
    });

    return requests.map((r) => ({
      id: r.id,
      senderId: r.receiver.id,
      senderName: `${r.receiver.firstName} ${r.receiver.lastName}`,
      senderProfileImage: r.receiver.profileImage,
      introMessage: r.content || undefined,
      status: r.status!,
      createdAt: r.createdAt,
    }));
  }

  async cancelMessageRequest(
    senderId: number,
    requestId: number,
  ): Promise<{ success: boolean }> {
    const request = await this.chatMessageRepository.findOne({
      where: {
        id: requestId,
        sender: { id: senderId },
        type: MessageType.MESSAGE_REQUEST,
        status: MessageRequestStatus.PENDING,
      },
    });

    if (!request) throw new NotFoundException('Demande en attente introuvable');

    await this.chatMessageRepository.remove(request);
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────
  // Messagerie
  // ─────────────────────────────────────────────────────────────

  async sendMessage(
    senderId: number,
    receiverId: number,
    sendMessageDto: SendMessageDto,
  ): Promise<ChatMessage> {
    const canChat = await this.canUsersChat(senderId, receiverId);
    if (!canChat) {
      throw new ForbiddenException(
        'Vous ne pouvez écrire qu\'à vos amis. Envoyez d\'abord une demande de contact.',
      );
    }

    if (!sendMessageDto.content?.trim()) {
      throw new BadRequestException('Le message ne peut pas être vide');
    }

    if (sendMessageDto.parentMessageId) {
      const exists = await this.chatMessageRepository.exists({
        where: { id: sendMessageDto.parentMessageId },
      });
      if (!exists) throw new NotFoundException('Message parent introuvable');
    }

    // Si le destinataire a une demande en attente envers l'expéditeur,
    // envoyer un message = acceptation implicite de cette demande.
    const pendingFromReceiver = await this.chatMessageRepository.findOne({
      where: {
        sender: { id: receiverId },
        receiver: { id: senderId },
        type: MessageType.MESSAGE_REQUEST,
        status: MessageRequestStatus.PENDING,
      },
    });
    if (pendingFromReceiver) {
      pendingFromReceiver.status = MessageRequestStatus.ACCEPTED;
      await this.chatMessageRepository.save(pendingFromReceiver);
      await this.createSystemWelcomeMessage(senderId, receiverId);
    }

    const message = this.chatMessageRepository.create({
      sender: { id: senderId } as User,
      receiver: { id: receiverId } as User,
      content: sendMessageDto.content.trim(),
      type: sendMessageDto.type || MessageType.TEXT,
      filename: sendMessageDto.filename,
      mimetype: sendMessageDto.mimetype,
      isRead: false,
      conversationId: this.generateConversationId(senderId, receiverId),
      parentMessageId: sendMessageDto.parentMessageId,
      forwardedFrom: sendMessageDto.forwardedFrom,
      reactions: {},
    });

    return this.chatMessageRepository.save(message);
  }

  async sendFileMessage(
    senderId: number,
    receiverId: number,
    fileUrl: string,
    filename: string,
    mimetype: string,
  ): Promise<ChatMessage> {
    const type = mimetype.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE;
    return this.sendMessage(senderId, receiverId, {
      content: fileUrl,
      type,
      filename,
      mimetype,
    });
  }

  async getConversationHistory(
    userId1: number,
    userId2: number,
    page = 1,
    limit = 20,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    // Voir l'historique est autorisé dès qu'une demande existe (même en attente)
    const canView = await this.canUsersViewHistory(userId1, userId2);
    if (!canView) {
      throw new ForbiddenException('Accès à la conversation refusé');
    }

    const conversationId = this.generateConversationId(userId1, userId2);
    const skip = (page - 1) * limit;

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return { messages: messages.reverse(), total };
  }

  async getUserConversations(userId: number): Promise<any[]> {
    const [messages, settings] = await Promise.all([
      this.chatMessageRepository
        .createQueryBuilder('message')
        .leftJoinAndSelect('message.sender', 'sender')
        .leftJoinAndSelect('message.receiver', 'receiver')
        .where('message.senderId = :userId OR message.receiverId = :userId', { userId })
        .orderBy('message.createdAt', 'DESC')
        .getMany(),
      this.conversationSettingsRepository.find({ where: { userId } }),
    ]);

    const settingsMap = new Map<string, ConversationSettings>(
      settings.map((s) => [s.conversationId, s]),
    );

    const conversationMap = new Map<string, any>();

    for (const msg of messages) {
      const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender;
      if (!otherUser) continue;
      const convId = this.generateConversationId(userId, otherUser.id);

      if (!conversationMap.has(convId)) {
        const s = settingsMap.get(convId);
        conversationMap.set(convId, {
          conversationId: convId,
          participant: {
            id: otherUser.id,
            firstName: otherUser.firstName,
            lastName: otherUser.lastName,
            fullName: `${otherUser.firstName} ${otherUser.lastName}`,
            profileImage: otherUser.profileImage,
            isOnline: otherUser.isOnline,
          },
          lastMessage: null,
          unreadCount: 0,
          pendingRequest: null,
          isPinned: s?.isPinned ?? false,
          isMuted: s?.isMuted ?? false,
        });
      }

      const conv = conversationMap.get(convId);

      const isNewer =
        !conv.lastMessage ||
        new Date(msg.createdAt) > new Date(conv.lastMessage.createdAt);

      if (isNewer) {
        conv.lastMessage = {
          id: msg.id,
          content: msg.type === MessageType.MESSAGE_REQUEST
            ? '📩 Demande de contact'
            : msg.content,
          type: msg.type,
          senderId: msg.sender.id,
          createdAt: msg.createdAt,
          isRead: msg.isRead,
          status: msg.status ?? undefined,
        };
      }

      if (
        msg.type === MessageType.MESSAGE_REQUEST &&
        msg.status === MessageRequestStatus.PENDING &&
        msg.receiver?.id === userId &&
        !conv.pendingRequest
      ) {
        conv.pendingRequest = {
          id: msg.id,
          introMessage: msg.content,
        };
      }

      if (
        msg.type !== MessageType.MESSAGE_REQUEST &&
        msg.type !== MessageType.SYSTEM &&
        msg.sender.id !== userId &&
        !msg.isRead
      ) {
        conv.unreadCount++;
      }
    }

    return Array.from(conversationMap.values())
      .filter((conv) => {
        const last = conv.lastMessage;
        if (
          last?.type === MessageType.MESSAGE_REQUEST &&
          last?.status === MessageRequestStatus.DECLINED &&
          last?.senderId !== userId
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned conversations always come first
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async markMessagesAsRead(userId: number, conversationId: string): Promise<number> {
    const result = await this.chatMessageRepository.update(
      { receiver: { id: userId }, conversationId, isRead: false },
      { isRead: true },
    );
    return result.affected ?? 0;
  }

  async deleteMessage(messageId: number, userId: number): Promise<void> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.sender.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }
    await this.chatMessageRepository.remove(message);
  }

  async getUnreadCount(userId: number, conversationId: string): Promise<number> {
    return this.chatMessageRepository.count({
      where: { receiver: { id: userId }, conversationId, isRead: false },
    });
  }

  async searchMessages(
    userId: number,
    otherUserId: number,
    searchDto: SearchMessagesDto,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const conversationId = this.generateConversationId(userId, otherUserId);
    const page = searchDto.page ?? 1;
    const limit = searchDto.limit ?? 20;
    const skip = (page - 1) * limit;

    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { conversationId, content: ILike(`%${searchDto.query}%`) },
      relations: ['sender', 'receiver', 'parentMessage'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return { messages: messages.reverse(), total };
  }

  async addReaction(
    messageId: number,
    userId: number,
    addReactionDto: AddReactionDto,
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    });
    if (!message) throw new NotFoundException('Message introuvable');

    const otherId = message.sender.id === userId
      ? message.receiver.id
      : message.sender.id;

    if (!(await this.canUsersChat(userId, otherId))) {
      throw new ForbiddenException('Non autorisé');
    }

    if (!message.reactions) message.reactions = {};
    const emoji = addReactionDto.emoji;

    for (const key of Object.keys(message.reactions)) {
      message.reactions[key] = message.reactions[key].filter((id) => id !== userId);
    }

    if (!message.reactions[emoji]) message.reactions[emoji] = [];
    message.reactions[emoji].push(userId);

    for (const key of Object.keys(message.reactions)) {
      if (message.reactions[key].length === 0) delete message.reactions[key];
    }

    await this.chatMessageRepository.save(message);

    return (await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    }))!;
  }

  async removeReaction(messageId: number, userId: number, emoji: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message introuvable');
    if (!message.reactions?.[emoji]) {
      throw new BadRequestException('Cette réaction n\'existe pas');
    }

    message.reactions[emoji] = message.reactions[emoji].filter((id) => id !== userId);
    if (message.reactions[emoji].length === 0) delete message.reactions[emoji];

    await this.chatMessageRepository.save(message);

    return (await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    }))!;
  }

  async forwardMessage(
    messageId: number,
    senderId: number,
    forwardDto: ForwardMessageDto,
  ): Promise<ChatMessage[]> {
    const originalMessage = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });
    if (!originalMessage) throw new NotFoundException('Message introuvable');

    const forwardedMessages: ChatMessage[] = [];

    for (const receiverId of forwardDto.receiverIds) {
      if (!(await this.canUsersChat(senderId, receiverId))) {
        this.logger.warn(`Impossible de transférer à ${receiverId} — ignoré`);
        continue;
      }

      const msg = this.chatMessageRepository.create({
        sender: { id: senderId } as User,
        receiver: { id: receiverId } as User,
        content: forwardDto.forwardComment
          ? `${forwardDto.forwardComment}\n\n---\nTransféré :\n${originalMessage.content}`
          : originalMessage.content,
        type: originalMessage.type,
        filename: originalMessage.filename,
        mimetype: originalMessage.mimetype,
        conversationId: this.generateConversationId(senderId, receiverId),
        forwardedFrom: originalMessage.sender.id,
        reactions: {},
        isRead: false,
      });

      forwardedMessages.push(await this.chatMessageRepository.save(msg));
    }

    return forwardedMessages;
  }

  async editMessage(messageId: number, userId: number, newContent: string): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });
    if (!message) throw new NotFoundException('Message introuvable');
    if (message.sender.id !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    message.content = newContent.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await this.chatMessageRepository.save(message);

    return (await this.chatMessageRepository.findOne({
      where: { id: messageId },
      relations: ['sender', 'receiver'],
    }))!;
  }

  async getMessageReplies(
    messageId: number,
    page = 1,
    limit = 20,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const skip = (page - 1) * limit;
    const [messages, total] = await this.chatMessageRepository.findAndCount({
      where: { parentMessageId: messageId },
      relations: ['sender', 'receiver'],
      order: { createdAt: 'ASC' },
      take: limit,
      skip,
    });
    return { messages, total };
  }

  // ─────────────────────────────────────────────────────────────
  // Supprimer une conversation
  // ─────────────────────────────────────────────────────────────

  async deleteConversation(userId: number, otherUserId: number): Promise<{ deleted: number }> {
    const conversationId = this.generateConversationId(userId, otherUserId);
    const messages = await this.chatMessageRepository.find({ where: { conversationId } });
    await this.chatMessageRepository.remove(messages);
    return { deleted: messages.length };
  }

  // ─────────────────────────────────────────────────────────────
  // Bloquer / débloquer un utilisateur
  // ─────────────────────────────────────────────────────────────

  async blockUser(blockerId: number, blockedId: number): Promise<{ success: boolean }> {
    if (blockerId === blockedId) throw new BadRequestException('Vous ne pouvez pas vous bloquer vous-même');
    await this.findUserOrFail(blockedId);
    const existing = await this.userBlockRepository.findOne({ where: { blockerId, blockedId } });
    if (!existing) {
      await this.userBlockRepository.save(this.userBlockRepository.create({ blockerId, blockedId }));
    }
    return { success: true };
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<{ success: boolean }> {
    const block = await this.userBlockRepository.findOne({ where: { blockerId, blockedId } });
    if (block) await this.userBlockRepository.remove(block);
    return { success: true };
  }

  async getBlockedUserIds(userId: number): Promise<number[]> {
    const blocks = await this.userBlockRepository.find({ where: { blockerId: userId } });
    return blocks.map(b => b.blockedId);
  }

  async isBlockedByMe(blockerId: number, blockedId: number): Promise<boolean> {
    const block = await this.userBlockRepository.findOne({ where: { blockerId, blockedId } });
    return !!block;
  }

  // ─────────────────────────────────────────────────────────────
  // Pin / Mute
  // ─────────────────────────────────────────────────────────────

  private async getOrCreateSettings(
    userId: number,
    conversationId: string,
  ): Promise<ConversationSettings> {
    let settings = await this.conversationSettingsRepository.findOne({
      where: { userId, conversationId },
    });
    if (!settings) {
      settings = this.conversationSettingsRepository.create({ userId, conversationId });
    }
    return settings;
  }

  async togglePin(
    userId: number,
    conversationId: string,
  ): Promise<{ isPinned: boolean }> {
    const settings = await this.getOrCreateSettings(userId, conversationId);
    settings.isPinned = !settings.isPinned;
    await this.conversationSettingsRepository.save(settings);
    return { isPinned: settings.isPinned };
  }

  async toggleMute(
    userId: number,
    conversationId: string,
  ): Promise<{ isMuted: boolean }> {
    const settings = await this.getOrCreateSettings(userId, conversationId);
    settings.isMuted = !settings.isMuted;
    await this.conversationSettingsRepository.save(settings);
    return { isMuted: settings.isMuted };
  }

  async getConversationSettings(
    userId: number,
    conversationId: string,
  ): Promise<{ isPinned: boolean; isMuted: boolean }> {
    const s = await this.conversationSettingsRepository.findOne({
      where: { userId, conversationId },
    });
    return { isPinned: s?.isPinned ?? false, isMuted: s?.isMuted ?? false };
  }

  async getMessageStats(userId: number): Promise<{
    totalSent: number;
    totalReceived: number;
    totalConversations: number;
    mostActiveConversation: string | null;
    averageMessagesPerDay: number;
  }> {
    const [totalSent, totalReceived] = await Promise.all([
      this.chatMessageRepository.count({ where: { sender: { id: userId } } }),
      this.chatMessageRepository.count({ where: { receiver: { id: userId } } }),
    ]);

    const messages = await this.chatMessageRepository.find({
      where: [{ sender: { id: userId } }, { receiver: { id: userId } }],
      select: ['conversationId'],
    });

    const conversationCounts = new Map<string, number>();
    for (const msg of messages) {
      if (!msg.conversationId) continue;
      conversationCounts.set(
        msg.conversationId,
        (conversationCounts.get(msg.conversationId) ?? 0) + 1,
      );
    }

    let mostActiveConversation: string | null = null;
    let maxCount = 0;
    for (const [convId, count] of conversationCounts) {
      if (count > maxCount) { maxCount = count; mostActiveConversation = convId; }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messagesLast30Days = await this.chatMessageRepository.count({
      where: [
        { sender: { id: userId }, createdAt: Between(thirtyDaysAgo, new Date()) },
        { receiver: { id: userId }, createdAt: Between(thirtyDaysAgo, new Date()) },
      ],
    });

    return {
      totalSent,
      totalReceived,
      totalConversations: conversationCounts.size,
      mostActiveConversation,
      averageMessagesPerDay: parseFloat((messagesLast30Days / 30).toFixed(2)),
    };
  }
}