// Security utilities for OWASP Top 10 compliance

/**
 * Input Sanitization - Prevents XSS attacks
 * Enhanced to handle more XSS vectors
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove HTML tags and dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol (can be used for XSS)
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers (onclick, onerror, etc.)
    .replace(/&#x?[0-9a-f]+;/gi, '') // Remove HTML entities
    .replace(/&[a-z]+;/gi, '') // Remove named HTML entities
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object[^>]*>.*?<\/object>/gi, '') // Remove object tags
    .replace(/<embed[^>]*>/gi, '') // Remove embed tags
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .trim();
  
  // Additional check for encoded attacks
  try {
    // Decode common encoding attempts
    sanitized = decodeURIComponent(sanitized);
  } catch (e) {
    // If decoding fails, keep original (may be intentional)
  }
  
  return sanitized;
}

/**
 * Email validation - Prevents injection attacks
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isValid = emailRegex.test(email) && email.length <= 254;
  if (!isValid && import.meta.env.DEV) {
    console.log('Email validation failed:', { email, length: email.length, regexMatch: emailRegex.test(email) });
  }
  return isValid;
}

/**
 * Password strength validation
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiting tracker (client-side)
 * Note: Implement server-side rate limiting for production
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  checkLimit(identifier: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Generate secure random OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';
  
  // Use crypto.getRandomValues for cryptographically secure random numbers
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    otp += digits[randomValues[i] % 10];
  }
  
  return otp;
}

/**
 * Hash data (for client-side comparison only)
 * Note: Use bcrypt/argon2 on server-side for password hashing
 */
export async function simpleHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate file upload
 */
export function validateFileUpload(file: File, maxSizeMB: number = 10): {
  isValid: boolean;
  error?: string;
} {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File type not allowed. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG are permitted.',
    };
  }

  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${maxSizeMB}MB limit.`,
    };
  }

  return { isValid: true };
}

/**
 * Prevent SQL Injection in search queries
 * Note: Always use parameterized queries on the server-side
 */
export function sanitizeSQLInput(input: string): string {
  return input
    .replace(/['";\\]/g, '') // Remove SQL special characters
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * Content Security Policy helper
 */
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
};

/**
 * Session timeout manager
 */
export class SessionManager {
  private timeoutId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private readonly timeoutMs: number;

  constructor(timeoutMinutes: number = 30) {
    this.timeoutMs = timeoutMinutes * 60 * 1000;
  }

  resetTimer(onTimeout: () => void): void {
    this.lastActivity = Date.now();
    
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      onTimeout();
    }, this.timeoutMs);
  }

  clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

/**
 * CSRF Token generator (for production API calls)
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
