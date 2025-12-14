import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EvaluationService {
  private readonly jsonFilePath = path.join(process.cwd(), 'evaluation-data.json');

  /**
   * Saves user login data to JSON file on first login
   */
  async logUserLogin(firstName: string, lastName: string, userId: string): Promise<void> {
    try {
      const fullName = `${firstName}${lastName}`;
      
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
          recommendations: {
            'basic-filtering': {
              likes: 0
            },
            'content-based': {
              likes: 0
            },
            'collaborative': {
              likes: 0
            },
            'hybrid': {
              likes: 0
            }
          }
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
    message: string,
    firstName: string,
    lastName: string,
    userId: string
  ): Promise<void> {
    try {

      console.log("[LOG CHAT]: fullname: ", firstName+lastName)
      const fullName = firstName + lastName
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
          userId: userId,
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

  /**
   * Logs a like for a specific recommendation algorithm
   * @param firstName User's first name
   * @param lastName User's last name
   * @param userId User's ID
   * @param algorithm The recommendation algorithm used ('basic-filtering', 'content-based', 'collaborative', 'hybrid')
   */
  async logRecommendationLike(
    firstName: string,
    lastName: string,
    userId: string,
    algorithm: 'basic-filtering' | 'content-based' | 'collaborative' | 'hybrid'
  ): Promise<void> {
    try {
      const fullName = `${firstName}${lastName}`;
      
      // Read existing data or create new object
      let data: any = {};
      if (fs.existsSync(this.jsonFilePath)) {
        const fileContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
        data = JSON.parse(fileContent);
      }

      // Initialize user entry if doesn't exist
      if (!data[fullName]) {
        data[fullName] = {
          userId: userId,
          firstLoginTimestamp: new Date().toISOString(),
          recommendations: {
            'basic-filtering': { likes: 0 },
            'content-based': { likes: 0 },
            'collaborative': { likes: 0 },
            'hybrid': { likes: 0 }
          }
        };
      }

      // Initialize recommendations object if doesn't exist
      if (!data[fullName].recommendations) {
        data[fullName].recommendations = {
          'basic-filtering': { likes: 0 },
          'content-based': { likes: 0 },
          'collaborative': { likes: 0 },
          'hybrid': { likes: 0 }
        };
      }

      // Initialize specific algorithm if doesn't exist
      if (!data[fullName].recommendations[algorithm]) {
        data[fullName].recommendations[algorithm] = { likes: 0 };
      }

      // Increment like counter for the algorithm
      data[fullName].recommendations[algorithm].likes++;

      // Write to file
      fs.writeFileSync(
        this.jsonFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      console.log(`[Evaluation] Recommendation like logged for ${fullName} - Algorithm: ${algorithm} - Total likes: ${data[fullName].recommendations[algorithm].likes}`);
    } catch (error) {
      console.error('[Evaluation] Error logging recommendation like:', error);
      // Don't throw error to avoid breaking like flow
    }
  }

  /**
   * Logs a like for a project suggested by the chatbot
   * @param firstName User's first name
   * @param lastName User's last name
   * @param userId User's ID
   * @param projectId The project ID that was liked
   */
  async logChatbotLike(
    firstName: string,
    lastName: string,
    userId: string,
    projectId: string
  ): Promise<void> {
    try {
      const fullName = `${firstName}${lastName}`;
      
      // Read existing data or create new object
      let data: any = {};
      if (fs.existsSync(this.jsonFilePath)) {
        const fileContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
        data = JSON.parse(fileContent);
      }

      // Initialize user entry if doesn't exist
      if (!data[fullName]) {
        data[fullName] = {
          userId: userId,
          firstLoginTimestamp: new Date().toISOString(),
          chatbot: {
            likes: 0,
            likedProjects: []
          }
        };
      }

      // Initialize chatbot object if doesn't exist
      if (!data[fullName].chatbot) {
        data[fullName].chatbot = {
          likes: 0,
          likedProjects: []
        };
      }

      // Increment like counter and add project ID with timestamp
      data[fullName].chatbot.likes++;
      data[fullName].chatbot.likedProjects.push({
        projectId: projectId,
        timestamp: new Date().toISOString()
      });

      // Write to file
      fs.writeFileSync(
        this.jsonFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );

      console.log(`[Evaluation] Chatbot like logged for ${fullName} - Project: ${projectId} - Total chatbot likes: ${data[fullName].chatbot.likes}`);
    } catch (error) {
      console.error('[Evaluation] Error logging chatbot like:', error);
      // Don't throw error to avoid breaking like flow
    }
  }
}
