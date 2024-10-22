import {
    SubscribeMessage,
    WebSocketGateway,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/chat', cors: true })
@Injectable()
export class ChatGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('ChatGateway');

    constructor(private chatService: ChatService) { }

    //@UseGuards(JwtAuthGuard) // Use the guard to protect the WebSocket connection
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { message: string },
    ): Promise<void> {
        try {
            // The user information should already be available in the request due to the guard
            const user = client.handshake.auth.user; // Assuming the user data is attached by the guard

            // Send the user's message to the Python chatbot service
            const botResponse = await this.chatService.sendMessageToBot(payload.message);

            // Emit the bot's response back to the user
            client.emit('receiveMessage', { message: botResponse });
        } catch (error) {
            this.logger.error('Failed to communicate with the chatbot', error);
            client.emit('error', 'Failed to communicate with chatbot');
        }
    }

    afterInit(server: Server) {
        this.logger.log('Initialized');
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }
}