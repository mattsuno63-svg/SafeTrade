/**
 * Utility functions for chat message validation and sanitization
 */

import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize message content to prevent XSS attacks
 * Removes all HTML/JavaScript but preserves plain text
 */
export function sanitizeMessage(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [],  // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,  // Keep text content
  }).trim()
}

/**
 * Validate message content
 * Returns validation result with error message if invalid
 */
export function validateMessage(content: string): { valid: boolean; error?: string } {
  // 1. Check length
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Il messaggio non può essere vuoto' }
  }
  
  if (content.length > 2000) {
    return { valid: false, error: 'Il messaggio è troppo lungo (massimo 2000 caratteri)' }
  }
  
  // 2. Check for valid Unicode characters (no control characters except newline/tab)
  // Allow: letters, numbers, punctuation, emoji, whitespace, newlines
  const invalidCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/
  if (invalidCharPattern.test(content)) {
    return { valid: false, error: 'Il messaggio contiene caratteri non validi' }
  }
  
  // 3. Check for excessive whitespace (spam detection)
  const excessiveWhitespace = /^\s+$/.test(content)
  if (excessiveWhitespace) {
    return { valid: false, error: 'Il messaggio non può contenere solo spazi' }
  }
  
  return { valid: true }
}

/**
 * Check for spam patterns
 * Detects repeated identical messages
 * Note: This is a basic check. For production, use Redis or database to track recent messages
 */
export function detectSpamPattern(content: string, recentMessages: string[]): { isSpam: boolean; reason?: string } {
  // Check if message is identical to recent messages (max 3 identical in last minute)
  const identicalCount = recentMessages.filter(msg => msg === content).length
  if (identicalCount >= 3) {
    return { isSpam: true, reason: 'Messaggio identico inviato troppe volte' }
  }
  
  // Check for excessive repetition of single character
  const singleCharPattern = /^(.)\1{50,}$/
  if (singleCharPattern.test(content)) {
    return { isSpam: true, reason: 'Messaggio contiene caratteri ripetuti eccessivamente' }
  }
  
  return { isSpam: false }
}

/**
 * Prepare message content for storage
 * Sanitizes and validates in one step
 */
export function prepareMessageContent(content: string): { 
  sanitized: string; 
  valid: boolean; 
  error?: string 
} {
  // First validate
  const validation = validateMessage(content)
  if (!validation.valid) {
    return { sanitized: '', valid: false, error: validation.error }
  }
  
  // Then sanitize
  const sanitized = sanitizeMessage(content)
  
  // Validate again after sanitization (in case sanitization removed everything)
  if (sanitized.length === 0) {
    return { sanitized: '', valid: false, error: 'Il messaggio non può essere vuoto dopo la sanitizzazione' }
  }
  
  return { sanitized, valid: true }
}

