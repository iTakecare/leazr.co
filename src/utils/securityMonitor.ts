// Security monitoring utility
import { Logger } from './logger';

export class SecurityMonitor {
  private static rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  
  // Rate limiting for authentication attempts
  static checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const key = `auth_${identifier}`;
    
    const current = this.rateLimitMap.get(key);
    
    if (!current || now > current.resetTime) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (current.count >= maxAttempts) {
      Logger.security('Rate limit exceeded', { identifier, attempts: current.count });
      return false;
    }
    
    current.count++;
    return true;
  }
  
  // Monitor suspicious activities
  static logSuspiciousActivity(type: string, details: any): void {
    Logger.security(`Suspicious activity: ${type}`, details);
    
    // Enhanced security monitoring
    this.trackSecurityEvent(type, details);
    
    // In a real application, you might want to:
    // - Send alerts to administrators  
    // - Log to external security monitoring service
    // - Implement automatic blocking
  }

  // Track security events for analysis
  private static trackSecurityEvent(type: string, details: any): void {
    const event = {
      type,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Store in session for analysis (non-persistent)
    const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
    events.push(event);
    
    // Keep only last 50 events to prevent memory issues
    if (events.length > 50) {
      events.splice(0, events.length - 50);
    }
    
    sessionStorage.setItem('security_events', JSON.stringify(events));
  }
  
  // Validate session integrity
  static validateSession(sessionData: any): boolean {
    if (!sessionData) {
      this.logSuspiciousActivity('invalid_session', { reason: 'no_session_data' });
      return false;
    }
    
    // Check for session tampering
    if (sessionData.expires_at && new Date(sessionData.expires_at) < new Date()) {
      this.logSuspiciousActivity('expired_session', { expires_at: sessionData.expires_at });
      return false;
    }
    
    return true;
  }
  
  // Clean up old rate limit entries
  static cleanupRateLimit(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitMap) {
      if (now > value.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}