// src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { CurrentPayload } from 'src/users/decorators/current-payload.decorator';
import type { JwtPayloadType } from 'utils/types';
import { MessageRequestStatus } from './entities/chat-message.entity';
import {
  SendMessageDto,
  AddReactionDto,
  ForwardMessageDto,
  SendMessageRequestDto,
  RespondMessageRequestDto,
} from './dto/chat.dto';

const multerConfig = {
  storage: diskStorage({
    destination: './uploads/chat',
    filename: (req, file, cb) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Invalid file type'), false);
    }
  },
};

@Controller('api/chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // Message Requests
  // IMPORTANT: Literal routes (pending, sent) MUST be declared before
  // parameterized routes (:requestId) so NestJS matches them correctly.
  // ─────────────────────────────────────────────────────────────

  /**
   * Get pending message requests received
   * GET /api/chat/requests/pending
   */
  @Get('requests/pending')
  async getPendingMessageRequests(@CurrentPayload() payload: JwtPayloadType) {
    const requests = await this.chatService.getPendingMessageRequests(payload.sub);
    return { success: true, count: requests.length, requests };
  }

  /**
   * Get sent message requests
   * GET /api/chat/requests/sent
   */
  @Get('requests/sent')
  async getSentMessageRequests(@CurrentPayload() payload: JwtPayloadType) {
    const requests = await this.chatService.getSentMessageRequests(payload.sub);
    return { success: true, count: requests.length, requests };
  }

  /**
   * Send a message request to a non-friend
   * POST /api/chat/requests/:receiverId
   */
  @Post('requests/:receiverId')
  @HttpCode(HttpStatus.CREATED)
  async sendMessageRequest(
    @Param('receiverId', ParseIntPipe) receiverId: number,
    @Body() dto: SendMessageRequestDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const request = await this.chatService.sendMessageRequest(
      payload.sub,
      receiverId,
      dto,
    );
    return { success: true, request };
  }

  /**
   * Accept or decline a message request
   * PUT /api/chat/requests/:requestId
   */
  @Put('requests/:requestId')
  @HttpCode(HttpStatus.OK)
  async respondToMessageRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: RespondMessageRequestDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const result = await this.chatService.respondToMessageRequest(
      payload.sub,
      requestId,
      dto.action,
    );
    if (result.systemMessage) {
      this.chatGateway.emitNewMessage(result.systemMessage);
    }
    return {
      success: true,
      message:
        dto.action === MessageRequestStatus.ACCEPTED
          ? 'Message request accepted'
          : 'Message request declined',
      request: result.request,
    };
  }

  /**
   * Cancel a sent message request
   * DELETE /api/chat/requests/:requestId
   */
  @Delete('requests/:requestId')
  @HttpCode(HttpStatus.OK)
  async cancelMessageRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.cancelMessageRequest(payload.sub, requestId);
  }

  // ─────────────────────────────────────────────────────────────
  // Conversations & History
  // Literal routes (conversations, stats) before parameterized ones.
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all conversations for current user
   * GET /api/chat/conversations
   */
  @Get('conversations')
  async getUserConversations(@CurrentPayload() payload: JwtPayloadType) {
    const conversations = await this.chatService.getUserConversations(payload.sub);
    return { success: true, count: conversations.length, conversations };
  }

  /**
   * Get message statistics
   * GET /api/chat/stats
   */
  @Get('stats')
  async getMessageStats(@CurrentPayload() payload: JwtPayloadType) {
    const stats = await this.chatService.getMessageStats(payload.sub);
    return { success: true, stats };
  }

  /**
   * Get conversation history with a user
   * GET /api/chat/history/:userId?page=1&limit=20
   */
  @Get('history/:userId')
  async getConversationHistory(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const validPage = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));

    const result = await this.chatService.getConversationHistory(
      payload.sub,
      userId,
      validPage,
      validLimit,
    );

    return {
      success: true,
      conversationId: this.chatService.generateConversationId(payload.sub, userId),
      messages: result.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        status: msg.status ?? null,
        filename: msg.filename,
        mimetype: msg.mimetype,
        senderId: msg.sender.id,
        receiverId: msg.receiver.id,
        parentMessageId: msg.parentMessageId,
        forwardedFrom: msg.forwardedFrom,
        reactions: msg.reactions,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      })),
      pagination: { page: validPage, limit: validLimit, total: result.total },
    };
  }

  /**
   * Search messages in a conversation
   * GET /api/chat/search/:userId?query=hello
   */
  @Get('search/:userId')
  async searchMessages(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
    @Query('query') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('query parameter is required');
    }

    const validPage = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));

    const result = await this.chatService.searchMessages(payload.sub, userId, {
      query,
      page: validPage,
      limit: validLimit,
    });

    return {
      success: true,
      messages: result.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        filename: msg.filename,
        mimetype: msg.mimetype,
        senderId: msg.sender.id,
        receiverId: msg.receiver.id,
        parentMessageId: msg.parentMessageId,
        forwardedFrom: msg.forwardedFrom,
        reactions: msg.reactions,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
      })),
      pagination: { page: validPage, limit: validLimit, total: result.total },
    };
  }

  /**
   * Get replies to a message (thread)
   * GET /api/chat/replies/:messageId?page=1&limit=20
   */
  @Get('replies/:messageId')
  async getMessageReplies(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentPayload() payload: JwtPayloadType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const validPage = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));

    const result = await this.chatService.getMessageReplies(messageId, validPage, validLimit);

    return {
      success: true,
      messages: result.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        senderId: msg.sender.id,
        receiverId: msg.receiver.id,
        createdAt: msg.createdAt,
      })),
      pagination: { page: validPage, limit: validLimit, total: result.total },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Messaging
  // ─────────────────────────────────────────────────────────────

  /**
   * Send a text message
   * POST /api/chat/messages/:receiverId
   */
  @Post('messages/:receiverId')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('receiverId', ParseIntPipe) receiverId: number,
    @Body() sendMessageDto: SendMessageDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const message = await this.chatService.sendMessage(
      payload.sub,
      receiverId,
      sendMessageDto,
    );
    this.chatGateway.emitNewMessage(message);
    return {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        filename: message.filename,
        mimetype: message.mimetype,
        senderId: message.sender.id,
        receiverId: message.receiver.id,
        parentMessageId: message.parentMessageId,
        forwardedFrom: message.forwardedFrom,
        reactions: message.reactions ?? {},
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    };
  }

  /**
   * Edit a message
   * PATCH /api/chat/messages/:messageId
   */
  @Patch('messages/:messageId')
  async editMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body('content') newContent: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    if (!newContent?.trim()) {
      throw new BadRequestException('Message content cannot be empty');
    }
    const message = await this.chatService.editMessage(messageId, payload.sub, newContent);
    return {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        createdAt: message.createdAt,
      },
    };
  }

  /**
   * Delete a message
   * DELETE /api/chat/messages/:messageId
   */
  @Delete('messages/:messageId')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    await this.chatService.deleteMessage(messageId, payload.sub);
    return { success: true, message: 'Message deleted successfully' };
  }

  /**
   * Send a file/image message
   * POST /api/chat/files/:receiverId
   */
  @Post('files/:receiverId')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @HttpCode(HttpStatus.CREATED)
  async sendFileMessage(
    @Param('receiverId', ParseIntPipe) receiverId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const fileUrl = `${process.env.APP_URL || 'http://localhost:3000'}/uploads/chat/${file.filename}`;
    const message = await this.chatService.sendFileMessage(
      payload.sub,
      receiverId,
      fileUrl,
      file.originalname,
      file.mimetype,
    );
    this.chatGateway.emitNewMessage(message);
    return {
      success: true,
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        filename: message.filename,
        mimetype: message.mimetype,
        senderId: message.sender.id,
        receiverId: message.receiver.id,
        parentMessageId: message.parentMessageId,
        forwardedFrom: message.forwardedFrom,
        reactions: message.reactions ?? {},
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isRead: message.isRead,
        createdAt: message.createdAt,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Read / Unread
  // Literal 'unread' route must come before no other param conflicts here,
  // but kept separate for clarity.
  // ─────────────────────────────────────────────────────────────

  /**
   * Mark messages as read
   * POST /api/chat/read/:conversationId
   */
  @Post('read/:conversationId')
  @HttpCode(HttpStatus.OK)
  async markMessagesAsRead(
    @Param('conversationId') conversationId: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const count = await this.chatService.markMessagesAsRead(payload.sub, conversationId);
    return { success: true, markedAsRead: count };
  }

  /**
   * Get unread message count
   * GET /api/chat/unread/:conversationId
   */
  @Get('unread/:conversationId')
  async getUnreadCount(
    @Param('conversationId') conversationId: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const count = await this.chatService.getUnreadCount(payload.sub, conversationId);
    return { success: true, unreadCount: count };
  }

  // ─────────────────────────────────────────────────────────────
  // Reactions
  // ─────────────────────────────────────────────────────────────

  /**
   * Add reaction to a message
   * POST /api/chat/reactions/:messageId
   */
  @Post('reactions/:messageId')
  @HttpCode(HttpStatus.CREATED)
  async addReaction(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() addReactionDto: AddReactionDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const message = await this.chatService.addReaction(messageId, payload.sub, addReactionDto);
    return {
      success: true,
      message: { id: message.id, content: message.content, reactions: message.reactions },
    };
  }

  /**
   * Remove reaction from a message
   * DELETE /api/chat/reactions/:messageId?emoji=👍
   */
  @Delete('reactions/:messageId')
  async removeReaction(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Query('emoji') emoji: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    if (!emoji) throw new BadRequestException('Emoji parameter is required');
    const message = await this.chatService.removeReaction(messageId, payload.sub, emoji);
    return {
      success: true,
      message: { id: message.id, content: message.content, reactions: message.reactions },
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Conversations — delete
  // ─────────────────────────────────────────────────────────────

  /**
   * Delete all messages in a conversation
   * DELETE /api/chat/conversations/:userId
   */
  @Delete('conversations/:userId')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.deleteConversation(payload.sub, userId);
  }

  // ─────────────────────────────────────────────────────────────
  // Block / Unblock
  // ─────────────────────────────────────────────────────────────

  /**
   * Get list of blocked user IDs
   * GET /api/chat/block
   */
  @Get('block')
  async getBlockedUsers(@CurrentPayload() payload: JwtPayloadType) {
    const ids = await this.chatService.getBlockedUserIds(payload.sub);
    return { blockedIds: ids };
  }

  /**
   * Block a user
   * POST /api/chat/block/:userId
   */
  @Post('block/:userId')
  @HttpCode(HttpStatus.OK)
  async blockUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.blockUser(payload.sub, userId);
  }

  /**
   * Unblock a user
   * DELETE /api/chat/block/:userId
   */
  @Delete('block/:userId')
  @HttpCode(HttpStatus.OK)
  async unblockUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.unblockUser(payload.sub, userId);
  }

  /**
   * Check if I blocked a specific user
   * GET /api/chat/block/:userId
   */
  @Get('block/:userId')
  async isBlocked(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const blocked = await this.chatService.isBlockedByMe(payload.sub, userId);
    return { blocked };
  }

  // ─────────────────────────────────────────────────────────────
  // Forward
  // ─────────────────────────────────────────────────────────────

  /**
   * Forward a message to multiple users
   * POST /api/chat/forward/:messageId
   */
  @Post('forward/:messageId')
  @HttpCode(HttpStatus.CREATED)
  async forwardMessage(
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() forwardDto: ForwardMessageDto,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    const forwardedMessages = await this.chatService.forwardMessage(
      messageId,
      payload.sub,
      forwardDto,
    );
    return {
      success: true,
      count: forwardedMessages.length,
      messages: forwardedMessages.map((msg) => ({
        id: msg.id,
        receiverId: msg.receiver.id,
        content: msg.content,
        type: msg.type,
        forwardedFrom: msg.forwardedFrom,
        createdAt: msg.createdAt,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Pin / Mute
  // ─────────────────────────────────────────────────────────────

  /**
   * POST /api/chat/conversations/:conversationId/pin
   * Toggle pin state for a conversation
   */
  @Post('conversations/:conversationId/pin')
  @HttpCode(HttpStatus.OK)
  async togglePin(
    @Param('conversationId') conversationId: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.togglePin(payload.sub, conversationId);
  }

  /**
   * POST /api/chat/conversations/:conversationId/mute
   * Toggle mute state for a conversation
   */
  @Post('conversations/:conversationId/mute')
  @HttpCode(HttpStatus.OK)
  async toggleMute(
    @Param('conversationId') conversationId: string,
    @CurrentPayload() payload: JwtPayloadType,
  ) {
    return this.chatService.toggleMute(payload.sub, conversationId);
  }
}
