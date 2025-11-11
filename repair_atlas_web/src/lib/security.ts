import { headers } from 'next/headers';
import { logger } from './logger';

/**
 * Security utilities for web application
 */

export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://clerk.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://clerk.com https://api.stripe.com https://*.r2.cloudflarestorage.com",
      "frame-src 'self' https://clerk.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
    // HSTS (HTTP Strict Transport Security)
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  };
}

export async function validateCSRFToken(token: string): Promise<boolean> {
  // Get expected token from headers
  const headersList = await headers();
  const expectedToken = headersList.get('x-csrf-token');

  if (!expectedToken) {
    logger.warn('CSRF token missing from headers');
    return false;
  }

  if (token !== expectedToken) {
    logger.warn('CSRF token mismatch');
    return false;
  }

  return true;
}

export function generateCSRFToken(): string {
  // Generate a cryptographically secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function detectSuspiciousActivity(request: {
  ip?: string;
  userAgent?: string;
  path: string;
}): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check for common attack patterns in path
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempts
    /union.*select/i, // SQL injection
    /exec\(/i, // Code injection
    /eval\(/i, // Code injection
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(request.path)) {
      reasons.push(`Suspicious pattern in path: ${pattern}`);
    }
  }

  // Check User-Agent for known malicious patterns
  if (request.userAgent) {
    const maliciousAgents = ['sqlmap', 'nikto', 'nmap', 'masscan'];
    const lowerAgent = request.userAgent.toLowerCase();

    for (const agent of maliciousAgents) {
      if (lowerAgent.includes(agent)) {
        reasons.push(`Malicious user agent detected: ${agent}`);
      }
    }
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
  };
}

export function hashPassword(password: string): Promise<string> {
  // Note: In production, use bcrypt or argon2
  // This is a placeholder since we're using Clerk for auth
  return Promise.resolve(password);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Note: In production, use bcrypt or argon2
  return Promise.resolve(password === hash);
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;

  // Check exact match
  if (allowedOrigins.includes(origin)) return true;

  // Check wildcard matches
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      const pattern = new RegExp(
        '^' + allowed.replace('.', '\\.').replace('*', '.*') + '$'
      );
      if (pattern.test(origin)) return true;
    }
  }

  return false;
}

export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }

  const visible = data.slice(-visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);

  return masked + visible;
}

export function isValidIPAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
