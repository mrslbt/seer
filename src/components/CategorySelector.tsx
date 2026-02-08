/**
 * CategorySelector — Choose Your Domain
 *
 * A horizontal row of tappable life-domain glyphs that override
 * keyword-based question classification with 100% accuracy.
 * The user taps a domain before typing their question.
 */

import type { QuestionCategory } from '../types/astrology';
import './CategorySelector.css';

interface CategorySelectorProps {
  selected: QuestionCategory | null;
  onSelect: (category: QuestionCategory | null) => void;
}

interface SelectorCategory {
  key: QuestionCategory;
  icon: string;
  label: string;
}

/**
 * All 11 question categories with astrological glyphs.
 * Ordered by frequency of use (love/career/money first).
 */
const SELECTOR_CATEGORIES: SelectorCategory[] = [
  { key: 'love',          icon: '\u2640', label: 'Love' },          // ♀
  { key: 'career',        icon: '\u2644', label: 'Career' },        // ♄
  { key: 'money',         icon: '\u2643', label: 'Money' },         // ♃
  { key: 'health',        icon: '\u2642', label: 'Health' },        // ♂
  { key: 'decisions',     icon: '\u2609', label: 'Decisions' },     // ☉
  { key: 'social',        icon: '\u263F', label: 'Social' },        // ☿
  { key: 'creativity',    icon: '\u2646', label: 'Creative' },      // ♆
  { key: 'spiritual',     icon: '\u263D', label: 'Spirit' },        // ☽
  { key: 'communication', icon: '\u2604', label: 'Words' },         // ☄
  { key: 'timing',        icon: '\u29D7', label: 'Timing' },        // ⧗
  { key: 'conflict',      icon: '\u2694', label: 'Conflict' },      // ⚔
];

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="category-selector" role="radiogroup" aria-label="Choose a life domain">
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
  );
}
