/**
 * Question Validator (The Seer)
 *
 * Validates user questions to ensure they're meaningful.
 * Accepts any question type (not just yes/no).
 * Rejects gibberish and too short questions.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

// Minimum meaningful words required
const MIN_WORDS = 2;

// Minimum question length
const MIN_LENGTH = 8;


// Patterns for negative/avoidance questions
const NEGATIVE_PATTERNS = [
  /\bshould\s*(i|we)\s*not\b/i,
  /\bshouldn'?t\s*(i|we)\b/i,
  /\bshould\s*(i|we)\s*(avoid|skip|stop|quit|cancel|refuse|reject)\b/i,
  /\bshould\s*(i|we)\s*(wait|delay|hold off)\b/i,
  /\bis\s*it\s*(a\s*)?(bad|wrong|terrible|awful)\s*(idea|time|day|moment)\b/i,
  /\bdon'?t\s*(i|we)\b/i,
  /\bavoid\b/i,
  /\bstay\s*away\b/i,
  /\bnot\s*(a\s*)?(good|right|best|great)\s*(time|idea|day|moment)\b/i,
  /\bshould\s*(i|we)\s*break\s*up\b/i,
  /\bshould\s*(i|we)\s*end\b/i,
  /\bshould\s*(i|we)\s*leave\b/i,
  /\bshould\s*(i|we)\s*give\s*up\b/i,
];

// Common meaningless inputs
const GIBBERISH_PATTERNS = [
  /^[a-z]{1,3}$/i,           // Just 1-3 letters like "ss", "ab", "xyz"
  /^(.)\1+$/i,               // Repeated single character "aaaa", "ssss"
  /^[^a-z]*$/i,              // No letters at all
  /^[a-z]+$/i,               // Single word with no punctuation (likely gibberish)
  /^(test|testing|asdf|qwerty|hello|hi|hey|yo|ok|okay|yes|no|maybe)$/i,
];

// Words that suggest a real question
const MEANINGFUL_WORDS = [
  'should', 'will', 'can', 'is', 'are', 'do', 'does', 'would', 'could',
  'today', 'tomorrow', 'now', 'time', 'good', 'right', 'love', 'work',
  'job', 'money', 'relationship', 'partner', 'ask', 'tell', 'start',
  'begin', 'go', 'move', 'buy', 'sell', 'invest', 'travel', 'meet',
  'date', 'marry', 'confess', 'apply', 'quit', 'change', 'try'
];

/**
 * Check if question is negative/avoidance type
 */
export function isNegativeQuestion(question: string): boolean {
  return NEGATIVE_PATTERNS.some(pattern => pattern.test(question));
}

/**
 * Check if input looks like gibberish
 */
function isGibberish(text: string): boolean {
  const cleaned = text.trim().toLowerCase();

  // Check explicit gibberish patterns
  if (GIBBERISH_PATTERNS.some(pattern => pattern.test(cleaned))) {
    // Exception: if it contains meaningful words, it's probably real
    const words = cleaned.split(/\s+/);
    const hasMeaningfulWord = words.some(word =>
      MEANINGFUL_WORDS.includes(word.replace(/[?.,!]/g, ''))
    );
    if (!hasMeaningfulWord) {
      return true;
    }
  }

  // Check for keyboard mashing (high consonant ratio, rare letter combos)
  const consonants = cleaned.replace(/[^bcdfghjklmnpqrstvwxyz]/gi, '').length;
  const vowels = cleaned.replace(/[^aeiou]/gi, '').length;

  // If very high consonant to vowel ratio (like "sdfgh"), likely gibberish
  if (vowels > 0 && consonants / vowels > 4) {
    return true;
  }

  // If no vowels at all in a word longer than 3 chars, likely gibberish
  if (vowels === 0 && cleaned.length > 3) {
    return true;
  }

  return false;
}


/**
 * Count meaningful words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Validate a question
 */
export function validateQuestion(question: string): ValidationResult {
  const trimmed = question.trim();

  // Check minimum length
  if (trimmed.length < MIN_LENGTH) {
    return {
      isValid: false,
      error: 'Question too short',
      suggestion: 'Ask a complete question like "Should I ask for a raise today?"'
    };
  }

  // Check for gibberish
  if (isGibberish(trimmed)) {
    return {
      isValid: false,
      error: 'Please ask a real question',
      suggestion: 'Try asking something like "Is today a good day for important decisions?"'
    };
  }

  // Check minimum words
  if (countWords(trimmed) < MIN_WORDS) {
    return {
      isValid: false,
      error: 'Question needs more context',
      suggestion: 'Add more details like "Should I apply for this job?"'
    };
  }

  // The Seer accepts any question — no yes/no restriction
  // No negative question restriction either

  return { isValid: true };
}

/**
 * Get example questions for UI
 */
export const VALID_EXAMPLE_QUESTIONS = [
  "Should I confess my feelings today?",
  "What does love hold for me this week?",
  "Will my meeting go well today?",
  "Is today favorable for important decisions?",
  "How will my creative project unfold?",
  "What energy surrounds my finances?",
  "Should I take a leap of faith?",
  "What does the cosmos say about my health?",
];
