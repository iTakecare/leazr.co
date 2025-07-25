// Production-safe logging utility
const isDevelopment = import.meta.env.MODE === 'development';

export class Logger {
  static log(message: string, data?: any): void {
    if (isDevelopment) {
      console.log(message, data);
    }
  }

  static error(message: string, error?: any): void {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, only log generic error messages
      console.error('An error occurred');
    }
  }

  static warn(message: string, data?: any): void {
    if (isDevelopment) {
      console.warn(message, data);
    }
  }

  static debug(message: string, data?: any): void {
    if (isDevelopment) {
      console.debug(message, data);
    }
  }

  // Always log critical errors, but sanitize them
  static critical(message: string, error?: any): void {
    const sanitizedMessage = isDevelopment ? message : 'Critical system error occurred';
    console.error(sanitizedMessage, isDevelopment ? error : undefined);
  }
}