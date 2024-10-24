import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {

  constructor(
    private configService: ConfigService,
  ) { }

  async sendMessageToBot(message: string): Promise<any> {
    // Example of calling your Python chatbot service

    const response = await fetch(this.configService.get<string>('chatbot.url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 'message': message }),
    });

    // Check if the response is OK (status code 2xx)
    if (!response.ok) {
      throw new Error(`Failed to fetch from Python chatbot: ${response.statusText}`);
    }

    // Parse the response as JSON
    const data = await response.json();
    const decoded = await JSON.parse(data.response);
    
    // Ensure the response has the expected structure and includes the "output" key inside "response"
    if (!decoded || !decoded.message) {
      throw new Error('Invalid response format from Python chatbot');
    }

    return {
      message: decoded.message,
      projects: decoded.projects || [],
      users: decoded.users || []
    };
  } catch(error) {
    // Handle errors (e.g., network issues, invalid response formats, etc.)
    console.error('Error communicating with Python chatbot:', error);
    return 'There was an error processing your request. Please try again later.';
  }
}