import { useState } from 'react';
import { getRandomSuggestions, type SuggestedQuestion } from '../data/suggestedQuestions';
import { useI18n } from '../i18n/I18nContext';
import './SuggestedQuestions.css';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const { t } = useI18n();
  // Generate once on mount — fresh set each time component remounts
  const [suggestions] = useState<SuggestedQuestion[]>(() => getRandomSuggestions(5));

  return (
    <>
      <p className="suggestions-divider">{t('suggested.divider')}</p>
      <div className="suggested-questions" role="group" aria-label="Suggested questions">
        {suggestions.map((q) => (
          <button
            key={q.text}
            className="suggestion-chip"
            onClick={() => onSelect(q.text)}
            type="button"
          >
            {q.text}
          </button>
        ))}
      </div>
    </>
  );
}
