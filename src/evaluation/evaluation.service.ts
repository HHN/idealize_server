import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EvaluationService {
  private readonly jsonFilePath = path.join(process.cwd(), 'evaluation-data.json');
  private firstName;
  private lastName;

  /**
   * Saves user login data to JSON file on first login
   */
  async logUserLogin(firstName: string, lastName: string, userId: string): Promise<void> {
    try {
      const fullName = `${firstName}${lastName}`;
      this.firstName = firstName;
      this.lastName = lastName;
      
      console.log(`[Evaluation] Working directory: ${process.cwd()}`);
      console.log(`[Evaluation] JSON file path: ${this.jsonFilePath}`);
      
      // Read existing data or create new object
      let data: any = {};
      if (fs.existsSync(this.jsonFilePath)) {
        const fileContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
        data = JSON.parse(fileContent);
      }

      // Check if user already exists (only log first login)
      if (!data[fullName]) {
        data[fullName] = {
          userId: userId,
          firstLoginTimestamp: new Date().toISOString(),
        };

        // Write to file
        fs.writeFileSync(
          this.jsonFilePath,
          JSON.stringify(data, null, 2),
          'utf-8'
        );

        console.log(`[Evaluation] First login logged for user: ${fullName}`);
      }
    } catch (error) {
      console.error('[Evaluation] Error logging user login:', error);
      // Don't throw error to avoid breaking login flow
    }
  }

  /**
   * Logs chat response time for a user
   */
  async logChatResponseTime(
    responseTimeMs: number,
    message: string
  ): Promise<void> {
    try {
      const fullName = `${this.firstName}${this.lastName}`;
      console.log("[LOG CHAT]: fullname: ", fullName)
      // Read existing data or create new object
      let data: any = {};
      if (fs.existsSync(this.jsonFilePath)) {
        const fileContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
        data = JSON.parse(fileContent);
      }
      console.log("[LOG CHAT]: filepath: ", this.jsonFilePath)
      // Initialize user entry if doesn't exist
      if (!data[fullName]) {
        console.log("[LOG CHAT]: data cannot find")
        data[fullName] = {
          userId: 'unknown',
          firstLoginTimestamp: new Date().toISOString(),
          chatRequests: []
        };
      }

      // Initialize chatRequests array if doesn't exist
      if (!data[fullName].chatRequests) {
        console.log("[LOG CHAT]: Chatrequest key does not exist")
        data[fullName].chatRequests = [];
      }

      // Add chat request with response time
      data[fullName].chatRequests.push({
        timestamp: new Date().toISOString(),
        message: message.substring(0, 100), // Limit message length
        responseTimeMs: responseTimeMs
      });
      console.log("[LOG CHAT]: Data pushed to json")
      // Write to file
      fs.writeFileSync(
        this.jsonFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      console.log(`[Evaluation] Chat response time logged for ${fullName}: ${responseTimeMs}ms`);
    } catch (error) {
      console.error('[Evaluation] Error logging chat response time:', error);
      // Don't throw error to avoid breaking chat flow
    }
  }
}
