// src/notification/notification.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { 
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, string>(); // userId → socket.id

  handleConnection(client: Socket) {
    try {
      const userId = Number(client.handshake.query.userId || client.handshake.auth?.userId);

      if (!userId || isNaN(userId)) {
        console.warn('Connection rejected: Invalid userId');
        client.disconnect();
        return;
      }

      this.connectedUsers.set(userId, client.id);
      client.join(`user_${userId}`);

      console.log(`→ User ${userId} connected (socket ${client.id})`);
    } catch (error) {
      console.error('Error in handleConnection:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      // Find userId by socket.id more efficiently
      let disconnectedUserId: number | undefined;
      
      for (const [userId, socketId] of this.connectedUsers.entries()) {
        if (socketId === client.id) {
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        this.connectedUsers.delete(disconnectedUserId);
        console.log(`← User ${disconnectedUserId} disconnected`);
      }
    } catch (error) {
      console.error('Error in handleDisconnect:', error);
    }
  }

  /**
   * Send notification to a specific user
   */
  sendToUser(userId: number, payload: any) {
    try {
      const socketId = this.connectedUsers.get(userId);
      
      if (socketId) {
        this.server.to(`user_${userId}`).emit('new_notification', payload);
        console.log(`✓ Notification sent to user ${userId}`);
      } else {
        console.log(`⚠ User ${userId} not connected, notification saved for later`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  /**
   * Get count of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }
}