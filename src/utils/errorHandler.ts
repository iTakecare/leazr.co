// Secure error handling utility
import { Logger } from './logger';

const isDevelopment = import.meta.env.MODE === 'development';

export class ErrorHandler {
  // Generic error messages for production
  static getGenericMessage(errorType: string): string {
    const genericMessages = {
      auth: 'Authentication failed',
      network: 'Network error occurred',
      validation: 'Invalid input provided',
      permission: 'Access denied',
      server: 'Server error occurred',
      default: 'An error occurred'
    };

    return genericMessages[errorType as keyof typeof genericMessages] || genericMessages.default;
  }

  // Handle errors with secure messaging
  static handle(error: any, errorType: string = 'default'): string {
    Logger.error('Error occurred', isDevelopment ? error : undefined);

    if (isDevelopment) {
      return error?.message || this.getGenericMessage(errorType);
    }

    return this.getGenericMessage(errorType);
  }

  // Handle authentication errors specifically
  static handleAuthError(error: any): string {
    Logger.error('Authentication error', isDevelopment ? error : undefined);
    
    if (isDevelopment) {
      return error?.message || 'Authentication failed';
    }

    return 'Authentication failed';
  }

  // Handle API errors
  static handleApiError(error: any): string {
    Logger.error('API error', isDevelopment ? error : undefined);
    
    if (isDevelopment && error?.message) {
      return error.message;
    }

    return 'Request failed. Please try again.';
  }
}