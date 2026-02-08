import { useState, useEffect, useCallback, useRef } from 'react';
import type { Verdict, QuestionCategory } from '../types/astrology';
import { getSeerVerdictColor } from '../lib/oracleResponse';
import type { InsightArticle } from '../lib/insightArticle';
import { getScoreLabel } from '../lib/insightArticle';
import {
  generateFollowUpResponse,
  generateFollowUpQuestions,
  generateContextualFollowUpResponse,
  type FollowUpType,
  type FollowUpQuestion,
} from '../lib/followUpResponse';
import type { PersonalDailyReport } from '../lib/personalDailyReport';
import './OracleReading.css';

interface OracleReadingProps {
  oracleText: string;
  verdict: Verdict;
  category: QuestionCategory;
  article: InsightArticle | null;
  dailyReport: PersonalDailyReport | null;
  questionText: string;
  onAskAgain: () => void;
  onDismiss: () => void;
}

export function OracleReading({
  oracleText, verdict, category, article, dailyReport,
  questionText: _questionText, onAskAgain, onDismiss
}: OracleReadingProps) {
  const color = getSeerVerdictColor(verdict);
  const [showArticle, setShowArticle] = useState(false);
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [followUpType, setFollowUpType] = useState<FollowUpType | null>(null);
  const [followUpRound, setFollowUpRound] = useState(0); // 0 = initial, 1 = first follow-up, 2 = max
  const [contextualQuestions, setContextualQuestions] = useState<FollowUpQuestion[]>([]);
  const [shareToast, setShareToast] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate contextual follow-up questions on mount
  useEffect(() => {
    const questions = generateFollowUpQuestions(verdict, category, dailyReport);
    setContextualQuestions(questions);
  }, [verdict, category, dailyReport]);

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showArticle) {
        setShowArticle(false);
      } else if (followUpText) {
        setFollowUpText(null);
        setFollowUpType(null);
      } else {
        onDismiss();
      }
    }
  }, [showArticle, followUpText, onDismiss]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle follow-up (static buttons)
  const handleFollowUp = useCallback((type: FollowUpType) => {
    const response = generateFollowUpResponse(type, verdict, category, dailyReport);
    setFollowUpText(response);
    setFollowUpType(type);
    setFollowUpRound(prev => prev + 1);
  }, [verdict, category, dailyReport]);

  // Handle contextual follow-up question tap
  const handleContextualQuestion = useCallback((question: FollowUpQuestion) => {
    const response = generateContextualFollowUpResponse(
      question.text, verdict, category, dailyReport
    );
    setFollowUpText(response);
    setFollowUpType('contextual');
    setFollowUpRound(prev => prev + 1);

    // Generate new questions for next round (if under max)
    if (followUpRound < 1) {
      const nextQuestions = generateFollowUpQuestions(verdict, category, dailyReport)
        .filter(q => q.text !== question.text); // Don't repeat
      setContextualQuestions(nextQuestions.slice(0, 2));
    } else {
      setContextualQuestions([]); // Max rounds reached
    }
  }, [verdict, category, dailyReport, followUpRound]);

  // Handle share — generate canvas image
  const handleShare = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 600;
    const h = 400;
    canvas.width = w;
    canvas.height = h;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    // Subtle gold radial
    const grad = ctx.createRadialGradient(w / 2, h / 2 - 20, 0, w / 2, h / 2, 250);
    grad.addColorStop(0, 'rgba(201, 168, 76, 0.06)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Top label: "THE SEER"
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('THE SEER', w / 2, 40);

    // Verdict label
    const verdictLabels: Record<Verdict, string> = {
      HARD_YES: 'YES', SOFT_YES: 'LEANING YES', NEUTRAL: 'UNCERTAIN',
      SOFT_NO: 'LEANING NO', HARD_NO: 'NO', UNCLEAR: 'UNCLEAR',
    };
    ctx.fillStyle = color;
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText(verdictLabels[verdict], w / 2, 70);

    // Oracle text — word wrap
    ctx.fillStyle = color;
    ctx.font = 'italic 22px "Instrument Serif", Georgia, serif';
    const words = oracleText.split(' ');
    const lines: string[] = [];
    let currentLine = '\u201C';
    for (const word of words) {
      const test = currentLine + word + ' ';
      if (ctx.measureText(test).width > w - 100) {
        lines.push(currentLine);
        currentLine = word + ' ';
      } else {
        currentLine = test;
      }
    }
    currentLine = currentLine.trim() + '\u201D';
    lines.push(currentLine);

    const lineHeight = 34;
    const startY = h / 2 - (lines.length * lineHeight) / 2 + 20;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
    }

    // Bottom credit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('hiseer.vercel.app', w / 2, h - 24);

    // Export
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob && navigator.share) {
        const file = new File([blob], 'seer-reading.png', { type: 'image/png' });
        await navigator.share({ files: [file] });
      } else if (blob) {
        // Fallback: copy to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
      }
    } catch {
      // User cancelled share or clipboard failed
    }
  }, [oracleText, verdict, color]);

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

        {/* Follow-up response */}
        {followUpText && (
          <div className="follow-up-response" style={{ color }}>
            <div className="follow-up-label">
              {followUpType === 'when_change' ? 'Timing' : 'Deeper Insight'}
            </div>
            <p className="follow-up-text">{followUpText}</p>
          </div>
        )}

        {/* Primary actions */}
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

        {/* Follow-up actions — contextual questions + fixed options */}
        {followUpRound < 2 && (
          <div className="oracle-follow-ups">
            {/* Contextual questions (transit-aware) */}
            {contextualQuestions.map((q, i) => (
              <button
                key={i}
                className="follow-up-btn follow-up-btn--contextual"
                onClick={() => handleContextualQuestion(q)}
              >
                {q.text}
              </button>
            ))}

            {/* Fixed: When Will This Change? (always available) */}
            {followUpType !== 'when_change' && (
              <button
                className="follow-up-btn"
                onClick={() => handleFollowUp('when_change')}
              >
                When Will This Change?
              </button>
            )}

            {/* Share button (first round only) */}
            {followUpRound === 0 && (
              <button
                className="follow-up-btn follow-up-btn--share"
                onClick={handleShare}
              >
                Share
              </button>
            )}
          </div>
        )}

        {/* Share toast */}
        {shareToast && (
          <div className="share-toast">Copied to clipboard</div>
        )}

        {/* Hidden canvas for share card generation */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
