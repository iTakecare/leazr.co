// Input sanitization utility for security
export class InputSanitizer {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    if (!input) return '';
    
    // Create a temporary element to parse HTML
    const temp = document.createElement('div');
    temp.textContent = input;
    return temp.innerHTML;
  }

  // Sanitize SQL-like inputs (though we're using Supabase, this is extra protection)
  static sanitizeSql(input: string): string {
    if (!input) return '';
    
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /('|(\\')|(;)|(--)|(\|)|(\*))/gi,
      /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized.trim();
  }

  // Sanitize email input
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    // Basic email format validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = email.toLowerCase().trim();
    
    return emailRegex.test(sanitized) ? sanitized : '';
  }

  // Sanitize general text input
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (!input) return '';
    
    // Remove potentially dangerous characters
    const sanitized = input
      .replace(/[<>\"'&]/g, '') // Remove HTML-like characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/data:/gi, '') // Remove data: protocol
      .trim();
    
    return sanitized.substring(0, maxLength);
  }

  // Sanitize URL input
  static sanitizeUrl(url: string): string {
    if (!url) return '';
    
    try {
      const parsed = new URL(url);
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }
}