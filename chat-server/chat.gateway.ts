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

    // @UseGuards(JwtAuthGuard) // Use the guard to protect the WebSocket connection
    @SubscribeMessage('sendMessage')
    async handleMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: { message: string; firstName?: string; lastName?: string },
    ): Promise<void> {
        try {
            this.logger.log(`Received message from ${client.id}: "${payload.message}"`);
            
            // The user information should already be available in the request due to the guard
            const user = client.handshake.auth.user; // Assuming the user data is attached by the guard
            
            // Send the user's message to the Python chatbot service
            this.logger.log(`Calling chatbot endpoint...`);
            const botResponse = await this.chatService.sendMessageToBot(
                payload.message,
                payload.firstName,
                payload.lastName
            );
            this.logger.log(`Got response from Python chatbot`);

            // Emit the bot's response back to the user
            client.emit('receiveMessage', { message: botResponse });
            this.logger.log(`Sent response back to client ${client.id}`);
        } catch (error) {
            this.logger.error(`Error in handleMessage:`, error);
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