import validator from 'validator';
import { logger } from './logger';

/**
 * Sanitize and validate user input to prevent XSS, SQL injection, and other attacks
 */

export function sanitizeString(input: string, maxLength = 1000): string {
  // Trim whitespace
  let sanitized = input.trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Escape HTML
  sanitized = validator.escape(sanitized);

  return sanitized;
}

export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();

  if (!validator.isEmail(trimmed)) {
    logger.warn(`Invalid email attempt: ${email}`);
    return null;
  }

  return validator.normalizeEmail(trimmed) || null;
}

export function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();

  if (!validator.isURL(trimmed, {
    protocols: ['http', 'https'],
    require_protocol: true,
  })) {
    logger.warn(`Invalid URL attempt: ${url}`);
    return null;
  }

  return trimmed;
}

export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '');

  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Limit length
  if (sanitized.length > 255) {
    const extension = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 240) + '.' + extension;
  }

  return sanitized;
}

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
    };
  }

  return { valid: true };
}

export function sanitizeSearchQuery(query: string): string {
  // Remove SQL injection attempts
  let sanitized = query.trim();

  // Remove common SQL keywords
  const sqlKeywords = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'SELECT',
    'UNION', 'WHERE', 'FROM', 'EXEC', '--', ';',
  ];

  sqlKeywords.forEach((keyword) => {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(sanitized)) {
      logger.warn(`SQL injection attempt detected: ${query}`);
      sanitized = sanitized.replace(regex, '');
    }
  });

  // Limit length
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

export function validatePhoneNumber(phone: string): boolean {
  return validator.isMobilePhone(phone, 'any', { strictMode: false });
}

export function sanitizePhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return cleaned;
}

export function validateCreditCard(cardNumber: string): boolean {
  return validator.isCreditCard(cardNumber);
}

export function sanitizeNumericString(input: string): string {
  return input.replace(/[^0-9.-]/g, '');
}

export function validateAndSanitizeInput<T extends Record<string, unknown>>(
  input: T,
  schema: Record<keyof T, 'string' | 'email' | 'url' | 'number' | 'boolean'>
): { valid: boolean; sanitized?: Partial<T>; errors?: string[] } {
  const errors: string[] = [];
  const sanitized: Partial<T> = {};

  for (const [key, type] of Object.entries(schema)) {
    const value = input[key as keyof T];

    try {
      switch (type) {
        case 'string':
          if (typeof value === 'string') {
            sanitized[key as keyof T] = sanitizeString(value) as T[keyof T];
          } else {
            errors.push(`${key} must be a string`);
          }
          break;

        case 'email':
          if (typeof value === 'string') {
            const sanitizedEmail = sanitizeEmail(value);
            if (sanitizedEmail) {
              sanitized[key as keyof T] = sanitizedEmail as T[keyof T];
            } else {
              errors.push(`${key} must be a valid email`);
            }
          } else {
            errors.push(`${key} must be a string`);
          }
          break;

        case 'url':
          if (typeof value === 'string') {
            const sanitizedUrl = sanitizeUrl(value);
            if (sanitizedUrl) {
              sanitized[key as keyof T] = sanitizedUrl as T[keyof T];
            } else {
              errors.push(`${key} must be a valid URL`);
            }
          } else {
            errors.push(`${key} must be a string`);
          }
          break;

        case 'number':
          if (typeof value === 'number') {
            sanitized[key as keyof T] = value;
          } else if (typeof value === 'string') {
            const parsed = parseFloat(sanitizeNumericString(value));
            if (!isNaN(parsed)) {
              sanitized[key as keyof T] = parsed as T[keyof T];
            } else {
              errors.push(`${key} must be a valid number`);
            }
          } else {
            errors.push(`${key} must be a number`);
          }
          break;

        case 'boolean':
          if (typeof value === 'boolean') {
            sanitized[key as keyof T] = value;
          } else {
            errors.push(`${key} must be a boolean`);
          }
          break;
      }
    } catch (error) {
      errors.push(`Error sanitizing ${key}: ${error}`);
    }
  }

  return {
    valid: errors.length === 0,
    sanitized: errors.length === 0 ? sanitized : undefined,
    errors: errors.length > 0 ? errors : undefined,
  };
}
