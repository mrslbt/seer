import { useCallback, useRef } from 'react';
import { validateQuestion } from '../lib/questionValidator';
import './QuestionInput.css';

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  error?: string | null;
}

export function QuestionInput({ value, onChange, onSubmit, disabled, error }: QuestionInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
          type="text"
          className={`question-input ${error ? 'has-error' : ''}`}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Ask the Seer..."
          disabled={disabled}
          autoComplete="off"
          spellCheck="false"
          enterKeyHint="go"
        />
        <button
          className="ask-btn"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          type="button"
        >
          Ask
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
