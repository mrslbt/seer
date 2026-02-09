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
  const [followUpRound, setFollowUpRound] = useState(0);
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

    if (followUpRound < 1) {
      const nextQuestions = generateFollowUpQuestions(verdict, category, dailyReport)
        .filter(q => q.text !== question.text);
      setContextualQuestions(nextQuestions.slice(0, 2));
    } else {
      setContextualQuestions([]);
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

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    const grad = ctx.createRadialGradient(w / 2, h / 2 - 20, 0, w / 2, h / 2, 250);
    grad.addColorStop(0, 'rgba(201, 168, 76, 0.06)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(201, 168, 76, 0.4)';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('THE SEER', w / 2, 40);

    const verdictLabelsCanvas: Record<Verdict, string> = {
      HARD_YES: 'YES', SOFT_YES: 'LEANING YES', NEUTRAL: 'UNCERTAIN',
      SOFT_NO: 'LEANING NO', HARD_NO: 'NO', UNCLEAR: 'UNCLEAR',
    };
    ctx.fillStyle = color;
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText(verdictLabelsCanvas[verdict], w / 2, 70);

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

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('hiseer.vercel.app', w / 2, h - 24);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob && navigator.share) {
        const file = new File([blob], 'seer-reading.png', { type: 'image/png' });
        await navigator.share({ files: [file] });
      } else if (blob) {
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

  // ---- Article view ----
  if (showArticle && article) {
    return (
      <div className="oracle-overlay" role="dialog" aria-modal="true" aria-label={article.title}>
        <div className="oracle-reading oracle-reading--article" onClick={(e) => e.stopPropagation()}>
          <div className="article-header">
            <h2 className="article-title" style={{ color }}>{article.title}</h2>
            <div className="article-score">
              <span className="score-value" style={{ color }}>{article.score}</span>
              <span className="score-max">/10</span>
              <span className="score-label">{getScoreLabel(article.score)}</span>
            </div>
          </div>
          <div className="article-body">
            {article.sections.map((section, i) => (
              <div key={i} className="article-section">
                <h3 className="section-heading">{section.heading}</h3>
                <p className="section-body">{section.body}</p>
              </div>
            ))}
          </div>
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

  // ---- Reading view ----
  const verdictLabels: Record<Verdict, string> = {
    HARD_YES: 'Yes',
    SOFT_YES: 'Leaning Yes',
    NEUTRAL: 'Uncertain',
    SOFT_NO: 'Leaning No',
    HARD_NO: 'No',
    UNCLEAR: 'Unclear',
  };

  const hasFollowUps = followUpRound < 2 && (
    contextualQuestions.length > 0 || followUpType !== 'when_change'
  );

  return (
    <div className="oracle-overlay" role="dialog" aria-modal="true" aria-label="Oracle Reading">
      <div className="oracle-reading" onClick={(e) => e.stopPropagation()}>

        {/* Dismiss button */}
        <button className="oracle-dismiss" onClick={onDismiss} aria-label="Close reading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {/* Verdict label */}
        <div className="verdict-label" style={{ color }}>
          {verdictLabels[verdict]}
        </div>

        {/* Oracle prose */}
        <div className="oracle-text" style={{ color }}>
          <span className="oracle-quote oracle-quote--open">{'\u201C'}</span>
          {oracleText}
          <span className="oracle-quote oracle-quote--close">{'\u201D'}</span>
        </div>

        {/* Inline "why?" link — subtle, not a primary action */}
        {article && !followUpText && (
          <button className="oracle-why-link" onClick={() => setShowArticle(true)}>
            Why does the oracle say this?
          </button>
        )}

        {/* Follow-up response area */}
        {followUpText && (
          <div className="follow-up-response" style={{ color }}>
            <div className="follow-up-label">
              {followUpType === 'when_change' ? 'Timing' : 'Deeper Insight'}
            </div>
            <p className="follow-up-text">{followUpText}</p>
          </div>
        )}

        {/* ── Follow-up section: vertical stack of questions ── */}
        {hasFollowUps && (
          <div className="oracle-follow-ups">
            {/* Contextual transit-aware questions */}
            {contextualQuestions.map((q, i) => (
              <button
                key={i}
                className="follow-up-question"
                onClick={() => handleContextualQuestion(q)}
              >
                <span className="follow-up-question-icon">{'\u203A'}</span>
                <span className="follow-up-question-text">{q.text}</span>
              </button>
            ))}

            {/* "When Will This Change?" as a question row */}
            {followUpType !== 'when_change' && (
              <button
                className="follow-up-question follow-up-question--timing"
                onClick={() => handleFollowUp('when_change')}
              >
                <span className="follow-up-question-icon">{'\u29D7'}</span>
                <span className="follow-up-question-text">When will this change?</span>
              </button>
            )}
          </div>
        )}

        {/* Follow-ups exhausted message */}
        {!hasFollowUps && followUpRound > 0 && (
          <p className="follow-up-exhausted">The oracle has spoken. Ask again for a new reading.</p>
        )}

        {/* ── Bottom bar: Ask Again + Share icon ── */}
        <div className="oracle-bottom-bar">
          <button className="oracle-ask-again" onClick={onAskAgain}>
            Ask Again
          </button>

          <button
            className="oracle-share-icon"
            onClick={handleShare}
            aria-label="Share reading"
          >
            {/* Simple share arrow */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10V2M8 2L5 5M8 2L11 5" />
              <path d="M3 9V13H13V9" />
            </svg>
          </button>
        </div>

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
