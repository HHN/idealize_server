import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {

  constructor(
    private configService: ConfigService,
  ) { }

  async sendMessageToBot(message: string): Promise<string> {
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
    const decodedData = JSON.parse(data.response);
    // Ensure the response has the expected structure and includes the "output" key inside "response"
    if (!data || !data.response || !decodedData.result || !decodedData.result.output) {
      throw new Error('Invalid response format from Python chatbot');
    }

    // Return the value of the "output" key from the "response" object
    return decodedData.result.output;
  } catch(error) {
    // Handle errors (e.g., network issues, invalid response formats, etc.)
    console.error('Error communicating with Python chatbot:', error);
    return 'There was an error processing your request. Please try again later.';
  }
}