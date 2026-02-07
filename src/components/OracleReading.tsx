import { useState, useEffect, useCallback } from 'react';
import type { Verdict } from '../types/astrology';
import { getSeerVerdictColor } from '../lib/oracleResponse';
import type { InsightArticle } from '../lib/insightArticle';
import { getScoreLabel } from '../lib/insightArticle';
import './OracleReading.css';

interface OracleReadingProps {
  oracleText: string;
  verdict: Verdict;
  article: InsightArticle | null;
  onAskAgain: () => void;
  onDismiss: () => void;
}

export function OracleReading({ oracleText, verdict, article, onAskAgain, onDismiss }: OracleReadingProps) {
  const color = getSeerVerdictColor(verdict);
  const [showArticle, setShowArticle] = useState(false);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showArticle) {
        setShowArticle(false);
      } else {
        onDismiss();
      }
    }
  }, [showArticle, onDismiss]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (showArticle && article) {
    return (
      <div className="oracle-overlay" role="dialog" aria-modal="true" aria-label={article.title}>
        <div className="oracle-reading oracle-reading--article" onClick={(e) => e.stopPropagation()}>
          {/* Article header */}
          <div className="article-header">
            <h2 className="article-title" style={{ color }}>{article.title}</h2>
            <div className="article-score">
              <span className="score-value" style={{ color }}>{article.score}</span>
              <span className="score-max">/10</span>
              <span className="score-label">{getScoreLabel(article.score)}</span>
            </div>
          </div>

          {/* Article sections */}
          <div className="article-body">
            {article.sections.map((section, i) => (
              <div key={i} className="article-section">
                <h3 className="section-heading">{section.heading}</h3>
                <p className="section-body">{section.body}</p>
              </div>
            ))}
          </div>

          {/* Back button */}
          <div className="oracle-actions">
            <button className="oracle-btn oracle-btn--secondary" onClick={() => setShowArticle(false)}>
              Back
            </button>
            <button className="oracle-btn oracle-btn--secondary" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  const verdictLabels: Record<Verdict, string> = {
    HARD_YES: 'Yes',
    SOFT_YES: 'Leaning Yes',
    NEUTRAL: 'Uncertain',
    SOFT_NO: 'Leaning No',
    HARD_NO: 'No',
    UNCLEAR: 'Unclear',
  };

  return (
    <div className="oracle-overlay" role="dialog" aria-modal="true" aria-label="Oracle Reading">
      <div className="oracle-reading" onClick={(e) => e.stopPropagation()}>
        {/* Verdict label */}
        <div className="verdict-label" style={{ color }}>
          {verdictLabels[verdict]}
        </div>

        <div className="oracle-text" style={{ color }}>
          <span className="oracle-quote oracle-quote--open">{'\u201C'}</span>
          {oracleText}
          <span className="oracle-quote oracle-quote--close">{'\u201D'}</span>
        </div>

        <div className="oracle-actions">
          {article && (
            <button className="oracle-btn oracle-btn--why" onClick={() => setShowArticle(true)}>
              Why?
            </button>
          )}
          <button className="oracle-btn oracle-btn--again" onClick={onAskAgain}>
            Ask Again
          </button>
        </div>
      </div>
    </div>
  );
}
