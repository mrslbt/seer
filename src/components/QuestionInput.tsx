import { useCallback, useRef, useState, useEffect } from 'react';
import { validateQuestion } from '../lib/questionValidator';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/en';
import './QuestionInput.css';

const PLACEHOLDER_KEYS: TranslationKey[] = [
  'q.placeholder1', 'q.placeholder2', 'q.placeholder3', 'q.placeholder4',
  'q.placeholder5', 'q.placeholder6', 'q.placeholder7', 'q.placeholder8',
];

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string | null;
  customPlaceholder?: string;
}

export function QuestionInput({ value, onChange, onSubmit, disabled, error, customPlaceholder }: QuestionInputProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(
    () => Math.floor(Math.random() * PLACEHOLDER_KEYS.length)
  );

  // Rotate placeholder every 4 seconds when input is empty
  useEffect(() => {
    if (value) return; // Don't rotate while typing
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % PLACEHOLDER_KEYS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [value]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
      onSubmit();
    }
  }, [onSubmit]);

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  return (
    <div className="question-form">
      <div className="question-input-row">
        <input
          ref={inputRef}
          type="search"
          name="seer-question"
          aria-label="Ask the oracle a question"
          className={`question-input ${error ? 'has-error' : ''}`}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={customPlaceholder || t(PLACEHOLDER_KEYS[placeholderIndex])}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          enterKeyHint="go"
          data-form-type="other"
          data-lpignore="true"
        />
        <button
          className="ask-btn"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          type="button"
        >
          {t('oracle.ask')}
        </button>
      </div>
      {error && <div className="input-error">{error}</div>}
    </div>
  );
}

export function validateQuestionInput(question: string): { valid: boolean; error?: string } {
  const trimmed = question.trim();
  if (!trimmed) return { valid: false, error: 'Speak your question first' };

  const validation = validateQuestion(trimmed);
  if (!validation.isValid) {
    return { valid: false, error: validation.error || 'Ask a meaningful question' };
  }

  return { valid: true };
}
