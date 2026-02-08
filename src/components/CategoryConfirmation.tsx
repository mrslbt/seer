/**
 * CategoryConfirmation — "The oracle senses…"
 *
 * After the user submits a question, this component shows the auto-detected
 * category as a mystical "sensing" moment. The user can:
 *   - Do nothing → auto-proceeds to gazing after 2 seconds
 *   - Tap the sensed tag → opens the CategorySelector picker to correct
 *   - Press Enter or tap "Gaze" → proceeds immediately
 *   - Tap the question text → returns to edit their question
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { QuestionCategory } from '../types/astrology';
import { CategorySelector, SELECTOR_CATEGORIES } from './CategorySelector';
import './CategoryConfirmation.css';

interface CategoryConfirmationProps {
  question: string;
  detectedCategory: QuestionCategory;
  onConfirm: () => void;
  onCorrect: (category: QuestionCategory) => void;
  onEdit: () => void;
}

export function CategoryConfirmation({
  question,
  detectedCategory,
  onConfirm,
  onCorrect,
  onEdit,
}: CategoryConfirmationProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animKey, setAnimKey] = useState(0); // reset progress bar animation
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmedRef = useRef(false);

  const categoryMeta = SELECTOR_CATEGORIES.find(c => c.key === detectedCategory);

  // Stable confirm callback that prevents double-fires
  const safeConfirm = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    onConfirm();
  }, [onConfirm]);

  // Auto-proceed timer
  useEffect(() => {
    if (showPicker) {
      // Cancel timer while picker is open
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      safeConfirm();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [showPicker, safeConfirm, detectedCategory]);

  // Keyboard: Enter to confirm immediately
  // Delay registration so the Enter key that submitted the question doesn't
  // immediately trigger confirmation (same keypress event propagation).
  const readyRef = useRef(false);
  useEffect(() => {
    const mountDelay = setTimeout(() => { readyRef.current = true; }, 300);
    return () => clearTimeout(mountDelay);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!readyRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        safeConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeConfirm]);

  const handleOpenPicker = useCallback(() => {
    setShowPicker(true);
  }, []);

  const handlePickCategory = useCallback((cat: QuestionCategory | null) => {
    if (!cat) return;
    onCorrect(cat);
    setShowPicker(false);
    // Reset progress bar animation
    setAnimKey(prev => prev + 1);
    // Reset confirm guard so auto-timer can fire
    confirmedRef.current = false;
  }, [onCorrect]);

  return (
    <div className="category-confirmation">
      {/* The submitted question — tap to go back and edit */}
      <button className="confirmed-question" onClick={onEdit} type="button">
        "{question}"
      </button>

      {/* Sensed category tag */}
      <div className="sensed-category">
        <span className="sensed-label">The oracle senses…</span>

        {!showPicker ? (
          <>
            <button
              className="sensed-tag"
              onClick={handleOpenPicker}
              type="button"
            >
              <span className="sensed-glyph">{categoryMeta?.icon}</span>
              <span className="sensed-name">{categoryMeta?.label}</span>
            </button>
            <span className="sensed-hint">tap to change</span>
          </>
        ) : (
          <div className="sensed-picker-wrap">
            <CategorySelector
              selected={detectedCategory}
              onSelect={handlePickCategory}
            />
          </div>
        )}
      </div>

      {/* Proceed button */}
      <button className="proceed-btn" onClick={safeConfirm} type="button">
        Gaze
      </button>

      {/* Auto-proceed progress bar */}
      {!showPicker && (
        <div className="auto-proceed-bar" key={animKey}>
          <div className="auto-proceed-fill" />
        </div>
      )}
    </div>
  );
}
