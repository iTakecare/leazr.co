// Production-safe logging utility
const isDevelopment = import.meta.env.MODE === 'development';
const isProduction = import.meta.env.PROD;

export class Logger {
  static log(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.log(message, data);
    }
  }

  static error(message: string, error?: any): void {
    if (isDevelopment && !isProduction) {
      console.error(message, error);
    } else {
      // In production, completely suppress detailed error logs
      // Only log to external monitoring if configured
    }
  }

  static warn(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.warn(message, data);
    }
  }

  static debug(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.debug(message, data);
    }
  }

  // Security-focused logging - only in development
  static security(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.log(`🔒 SECURITY: ${message}`, data);
    }
  }

  // Product-focused logging - only in development
  static product(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.log(`📦 PRODUCT: ${message}`, data);
    }
  }

  // Commission-focused logging - only in development  
  static commission(message: string, data?: any): void {
    if (isDevelopment && !isProduction) {
      console.log(`💰 COMMISSION: ${message}`, data);
    }
  }

  // Always log critical errors, but sanitize them
  static critical(message: string, error?: any): void {
    const sanitizedMessage = isDevelopment ? message : 'Critical system error occurred';
    console.error(sanitizedMessage, isDevelopment ? error : undefined);
  }
}