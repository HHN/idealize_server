import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EvaluationService } from 'src/evaluation/evaluation.service';

// Currently not in use 
@Injectable()
export class ChatService {

  constructor(
    private configService: ConfigService,
    private evaluationService: EvaluationService,
  ) { }

  private logDebugInfo(stage: string, data: any): void {
    console.log(`=== CHATBOT DEBUG [${stage}] ===`);
    if (typeof data === 'object') {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(data);
    }
  }

  private logError(error: any): void {
    console.error('=== CHATBOT ERROR ===');
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
  }

  async sendMessageToBot(
    message: string,
    firstName?: string,
    lastName?: string,
    userId?: string
  ): Promise<any> {
    const startTime = Date.now();
    console.log("STARTTIME: ",startTime)
    try {
      const chatURL = this.configService.get<string>('chatbot.url');
      
      this.logDebugInfo('REQUEST', {
        url: chatURL,
        message: message,
        body: { message: message }
      });

      const response = await fetch(chatURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'message': message }),
      });

      this.logDebugInfo('RESPONSE', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logDebugInfo('ERROR_RESPONSE_BODY', errorText);
        throw new Error(`Failed to fetch from Python chatbot: ${response.statusText}`);
      }

      const rawData = await response.text();
      this.logDebugInfo('RAW_DATA', rawData);

      const data = JSON.parse(rawData);
      this.logDebugInfo('PARSED_DATA', data);

      const decoded = await JSON.parse(data.response);
      this.logDebugInfo('DECODED_RESPONSE', decoded);

      if (!decoded || !decoded.message) {
        throw new Error('Invalid response format from Python chatbot');
      }

      const result = {
        message: decoded.message,
        projects: decoded.projects || [],
        users: decoded.users || []
      };

      this.logDebugInfo('FINAL_RESULT', {
        message: result.message,
        projectCount: result.projects.length,
        projects: result.projects,
        userCount: result.users.length
      });

      // Calculate and log response time
      const responseTime = Date.now() - startTime;
      console.log("Responsetime: ",responseTime)
      await this.evaluationService.logChatResponseTime(
        responseTime,
        message,
        userId
      );
      

      return result;
    } catch(error) {
      this.logError(error);
      return 'There was an error processing your request. Please try again later.';
    }
  }
}