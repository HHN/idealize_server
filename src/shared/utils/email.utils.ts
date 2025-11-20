/**
 * Email utility functions for normalization and validation
 * Part of GDPR encryption implementation
 */

/**
 * Normalize email for consistent indexing and encryption
 * TODO SH: GDPR encryption - canonical form before HMAC/encrypt
 * 
 * @param email - Raw email address from user input or database
 * @returns Normalized email (lowercase, trimmed) or empty string if invalid
 * 
 * @example
 * normalizeEmail('  User@Example.COM  ') // returns 'user@example.com'
 */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

/**
 * Validate email format (basic RFC 5322 compliance)
 * TODO SH: GDPR encryption - validate before encryption to avoid storing invalid data
 * 
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
