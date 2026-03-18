import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  /**
   * userId -> Set<socketId>
   * Tracks all active sockets per user (user may be connected from multiple tabs)
   */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('NotificationsGateway initialized at namespace /notifications');
  }

  async handleConnection(socket: Socket) {
    try {
      // Accept token from query string or auth object (Socket.IO handshake)
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || '').replace('Bearer ', '').trim() ||
        socket.handshake.query?.token as string;

      if (!token) {
        this.logger.warn(`Socket ${socket.id} disconnected: no token`);
        socket.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });
      const userId: string = payload?.sub;

      if (!userId) {
        socket.disconnect();
        return;
      }

      socket.data.userId = userId;

      // Join a room keyed by userId so we can target this user from the service
      socket.join(`user:${userId}`);

      // Track socket IDs
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      this.logger.log(`Socket connected: ${socket.id} (user: ${userId})`);

      // Acknowledge successful connection
      socket.emit('connected', { userId, socketId: socket.id, timestamp: new Date().toISOString() });
    } catch (err) {
      this.logger.warn(`Socket ${socket.id} rejected: ${err.message}`);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId: string | undefined = socket.data?.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(socket.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.logger.log(`Socket disconnected: ${socket.id}`);
  }

  /**
   * Emit a real-time event to all sockets of a specific user.
   */
  emitToUser(userId: string, event: string, data: unknown): void {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast an event to ALL connected clients.
   */
  emitBroadcast(event: string, data: unknown): void {
    if (!this.server) return;
    this.server.emit(event, data);
  }

  /**
   * Return IDs of users currently online.
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Ping handler — client can send 'ping' to check liveness.
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket): void {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  }
}
