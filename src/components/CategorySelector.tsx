/**
 * CategorySelector — Guide the Oracle
 *
 * A horizontal scrollable strip of life-domain glyphs that *hint* the
 * scoring system toward a category. If the user's question clearly
 * matches a different category (strong keyword match), the classifier
 * wins — so selecting "money" and asking about health still scores health.
 *
 * Design: single horizontal row, horizontally scrollable, no wrapping.
 * The strip fades at edges to hint at scrollability.
 */

import type { QuestionCategory } from '../types/astrology';
import './CategorySelector.css';

interface CategorySelectorProps {
  selected: QuestionCategory | null;
  onSelect: (category: QuestionCategory | null) => void;
}

export interface SelectorCategory {
  key: QuestionCategory;
  icon: string;
  label: string;
}

/**
 * All 11 question categories with astrological glyphs.
 * Ordered by frequency of use (love/career/money first).
 */
export const SELECTOR_CATEGORIES: SelectorCategory[] = [
  { key: 'love',          icon: '\u2640', label: 'Love' },
  { key: 'career',        icon: '\u2644', label: 'Career' },
  { key: 'money',         icon: '\u2643', label: 'Money' },
  { key: 'health',        icon: '\u2642', label: 'Health' },
  { key: 'decisions',     icon: '\u2609', label: 'Decide' },
  { key: 'social',        icon: '\u263F', label: 'Social' },
  { key: 'creativity',    icon: '\u2646', label: 'Create' },
  { key: 'spiritual',     icon: '\u263D', label: 'Spirit' },
  { key: 'communication', icon: '\u2604', label: 'Words' },
  { key: 'timing',        icon: '\u29D7', label: 'Timing' },
  { key: 'conflict',      icon: '\u2694', label: 'Strife' },
];

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="category-selector-wrap">
      <div className="category-selector" role="radiogroup" aria-label="Guide the oracle toward a life domain">
        {SELECTOR_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`selector-glyph ${selected === cat.key ? 'selector-glyph--active' : ''}`}
            onClick={() => onSelect(selected === cat.key ? null : cat.key)}
            role="radio"
            aria-checked={selected === cat.key}
            aria-label={cat.label}
            type="button"
          >
            <span className="glyph-icon">{cat.icon}</span>
            <span className="glyph-label">{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
