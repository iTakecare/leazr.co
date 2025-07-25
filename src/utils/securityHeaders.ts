// Security headers utility for client-side security enhancements
export class SecurityHeaders {
  // Add Content Security Policy meta tag
  static addCSP(): void {
    const isProduction = import.meta.env.PROD;
    
    const csp = [
      "default-src 'self'",
      // More restrictive script-src for production
      isProduction 
        ? "script-src 'self' https://js.stripe.com"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Enhanced security directives
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');

    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'Content-Security-Policy');
    meta.setAttribute('content', csp);
    document.head.appendChild(meta);
  }

  // Add additional security meta tags
  static addSecurityMetas(): void {
    const securityMetas = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { httpEquiv: 'X-Content-Type-Options', content: 'nosniff' },
      { httpEquiv: 'X-Frame-Options', content: 'DENY' },
      { httpEquiv: 'X-XSS-Protection', content: '1; mode=block' },
      { httpEquiv: 'Strict-Transport-Security', content: 'max-age=31536000; includeSubDomains' }
    ];

    securityMetas.forEach(({ name, httpEquiv, content }) => {
      const meta = document.createElement('meta');
      if (name) meta.setAttribute('name', name);
      if (httpEquiv) meta.setAttribute('http-equiv', httpEquiv);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    });
  }

  // Initialize all security headers
  static initialize(): void {
    this.addCSP();
    this.addSecurityMetas();
  }
}