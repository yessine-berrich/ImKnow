import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiConversationMessage } from './entities/ai-conversation-message.entity';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class AiConversationService {
  constructor(
    @InjectRepository(AiConversation)
    private readonly convRepo: Repository<AiConversation>,
    @InjectRepository(AiConversationMessage)
    private readonly msgRepo: Repository<AiConversationMessage>,
    private readonly dataSource: DataSource,
  ) {}

  // ── List all conversations for a user ─────────────────────────────────────
  async findAll(userId: number) {
    const conversations = await this.convRepo.find({
      where: { userId },
      order: { pinned: 'DESC', updatedAt: 'DESC' },
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const messageCount = await this.msgRepo.count({
          where: { conversationId: conv.id },
        });
        const lastMsg = await this.msgRepo.findOne({
          where: { conversationId: conv.id },
          order: { createdAt: 'DESC' },
        });
        return {
          id: conv.id,
          title: conv.title,
          pinned: conv.pinned,
          userId: conv.userId,
          messageCount,
          preview: lastMsg?.content?.slice(0, 90) ?? '',
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      }),
    );
  }

  // ── Get one conversation with all messages ─────────────────────────────────
  async findOne(id: number, userId: number) {
    const conv = await this.convRepo.findOne({ where: { id, userId } });
    if (!conv) throw new NotFoundException('Conversation not found');

    const messages = await this.msgRepo.find({
      where: { conversationId: id },
      order: { createdAt: 'ASC' },
    });

    return { ...conv, messages };
  }

  // ── Create a new conversation (raw SQL to bypass any TypeORM metadata conflict) ──
  async create(userId: number, title: string): Promise<AiConversation> {
    const rows: AiConversation[] = await this.dataSource.query(
      `INSERT INTO ai_conversations (title, pinned, "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [title, false, userId],
    );
    return rows[0];
  }

  // ── Rename or pin / unpin ──────────────────────────────────────────────────
  async update(id: number, userId: number, dto: UpdateConversationDto) {
    const conv = await this.convRepo.findOne({ where: { id, userId } });
    if (!conv) throw new NotFoundException('Conversation not found');

    if (dto.title !== undefined) conv.title = dto.title.trim() || conv.title;
    if (dto.pinned !== undefined) conv.pinned = dto.pinned;

    return this.convRepo.save(conv);
  }

  // ── Delete a conversation (cascades messages) ──────────────────────────────
  async remove(id: number, userId: number) {
    const conv = await this.convRepo.findOne({ where: { id, userId } });
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.convRepo.remove(conv);
    return { success: true };
  }

  // ── Append a message to a conversation ────────────────────────────────────
  async addMessage(
    conversationId: number,
    role: 'user' | 'assistant',
    content: string,
    sources: any[] | null,
    isError: boolean,
  ): Promise<AiConversationMessage> {
    const rows: AiConversationMessage[] = await this.dataSource.query(
      `INSERT INTO ai_conversation_messages ("conversationId", role, content, sources, "isError", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [conversationId, role, content, sources ? JSON.stringify(sources) : null, isError],
    );
    // Bump updatedAt so the conversation rises in the list
    await this.dataSource.query(
      `UPDATE ai_conversations SET "updatedAt" = NOW() WHERE id = $1`,
      [conversationId],
    );
    return rows[0];
  }

  // ── Get existing or create new conversation ────────────────────────────────
  async getOrCreate(
    conversationId: number | undefined,
    userId: number,
    firstMessageText: string,
  ): Promise<AiConversation> {
    if (conversationId) {
      const existing = await this.convRepo.findOne({ where: { id: conversationId, userId } });
      if (existing) return existing;
    }
    // Auto-title: first 60 chars of the user question
    const title =
      firstMessageText.length > 60
        ? firstMessageText.slice(0, 57) + '...'
        : firstMessageText;
    return this.create(userId, title);
  }
}
