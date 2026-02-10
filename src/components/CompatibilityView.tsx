import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { SynastryReport } from '../lib/synastry';
import type { CompatibilityReading, RelationshipAnswer } from '../lib/compatibilityReading';
import {
  calculateSynastry,
  getTierLabel,
  getTierColor,
} from '../lib/synastry';
import {
  generateCompatibilityReading,
  answerRelationshipQuestion,
  getCompatibilityVerdictText,
  getCompatibilityVerdictColor,
} from '../lib/compatibilityReading';
import { calculateTodaysBond } from '../lib/todaysBond';
import TodaysBond from './TodaysBond';
import type { TodaysBondData } from './TodaysBond';
import { ZODIAC_SYMBOLS } from '../lib/astroEngine';
import { playClick, playReveal } from '../lib/sounds';
import { SeerEye } from './SeerEye';
import { validateQuestionInput } from './QuestionInput';
import { detectQuestionMode } from '../lib/scoreDecision';
import { callBondLLM } from '../lib/llmOracle';
import type { LLMOracleResult } from '../lib/llmOracle';
import './CompatibilityView.css';

// ============================================
// TYPES
// ============================================

interface CompatibilityViewProps {
  activeProfile: UserProfile;
  allProfiles: UserProfile[];
  onAddProfile: () => void;
}

type BondPhase =
  | 'select'           // Eye closed, pick a partner
  | 'summoning'        // Eye opening after partner chosen
  | 'reading'          // Eye open, reading revealed below
  | 'asking'           // Eye open, question input below
  | 'gazing'           // Eye gazing on a question
  | 'answered';        // Eye open, answer shown

// ============================================
// SUGGESTED RELATIONSHIP QUESTIONS
// ============================================

const RELATIONSHIP_QUESTIONS = [
  // Open-ended (guidance)
  'What brings us together?',
  'What places would we enjoy?',
  'What might we fight about?',
  'What is our biggest challenge?',
  'What kind of dates suit us?',
  'What makes this bond unique?',
  'How do we balance each other?',
  // Directional (yes/no)
  'Are we truly compatible?',
  'Is there real chemistry between us?',
  'Will this last?',
  'Can I trust them?',
  'Is now the right time?',
  'Are they serious about me?',
];

function getRandomQuestions(count: number): string[] {
  const shuffled = [...RELATIONSHIP_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// COMPONENT
// ============================================

export function CompatibilityView({ activeProfile, allProfiles, onAddProfile }: CompatibilityViewProps) {
  const [phase, setPhase] = useState<BondPhase>('select');
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<SynastryReport | null>(null);
  const [reading, setReading] = useState<CompatibilityReading | null>(null);
  const [answer, setAnswer] = useState<RelationshipAnswer | null>(null);
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [suggestions] = useState(() => getRandomQuestions(4));
  const [todaysBond, setTodaysBond] = useState<TodaysBondData | null>(null); // null until computed
  const [bondQuestionMode, setBondQuestionMode] = useState<'directional' | 'guidance'>('directional');
  const inputRef = useRef<HTMLInputElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const llmPromiseRef = useRef<Promise<LLMOracleResult> | null>(null);

  // Others = all profiles minus active
  const others = allProfiles.filter(p => p.id !== activeProfile.id);
  const hasOthers = others.length > 0;

  // Pair label shown above the eye
  const pairLabel = useMemo(() => {
    if (!partner) return null;
    const activeSun = activeProfile.natalChart.sun.sign;
    const partnerSun = partner.natalChart.sun.sign;
    return {
      name1: activeProfile.birthData.name,
      name2: partner.birthData.name,
      symbol1: ZODIAC_SYMBOLS[activeSun],
      symbol2: ZODIAC_SYMBOLS[partnerSun],
      sign1: activeSun,
      sign2: partnerSun,
    };
  }, [partner, activeProfile]);

  // ---- Eye state mapping ----
  const getEyeState = (): 'closed' | 'opening' | 'open' | 'gazing' | 'revealing' => {
    switch (phase) {
      case 'select': return 'closed';
      case 'summoning': return 'opening';
      case 'reading': return 'open';
      case 'asking': return 'open';
      case 'gazing': return 'gazing';
      case 'answered': return 'revealing';
      default: return 'closed';
    }
  };

  // ---- Select partner ----
  const handleSelectPartner = useCallback((p: UserProfile) => {
    playClick();
    setPartner(p);
    setPhase('summoning');
  }, []);

  // ---- Eye opened → compute synastry + reading ----
  const handleEyeOpenComplete = useCallback(() => {
    if (!partner) return;
    playReveal();
    const synastryReport = calculateSynastry(activeProfile, partner);
    const compatReading = generateCompatibilityReading(synastryReport);
    const dailyBond = calculateTodaysBond(activeProfile, partner, synastryReport);
    setReport(synastryReport);
    setReading(compatReading);
    setTodaysBond(dailyBond);
    setPhase('reading');
  }, [partner, activeProfile]);

  // ---- Eye finished gazing → generate answer ----
  const handleGazeComplete = useCallback(async () => {
    if (!partner || !report) return;
    playReveal();

    const trimmed = question.trim();
    const qMode = detectQuestionMode(trimmed);
    setBondQuestionMode(qMode);

    // Template fallback — always computed
    const templateAnswer = answerRelationshipQuestion(trimmed, activeProfile, partner, report);

    // Try LLM first
    if (llmPromiseRef.current) {
      try {
        const llmResult = await llmPromiseRef.current;
        llmPromiseRef.current = null;

        if (llmResult.source === 'llm' && llmResult.text) {
          // LLM succeeded — use its text, but keep template verdict for directional
          if (qMode === 'guidance') {
            setAnswer({
              verdict: 'uncertain', // not shown for guidance
              response: llmResult.text,
            });
          } else {
            setAnswer({
              verdict: templateAnswer.verdict,
              response: llmResult.text,
            });
          }
          setPhase('answered');
          return;
        }
      } catch (err) {
        console.warn('Bond LLM failed, using template:', err);
        llmPromiseRef.current = null;
      }
    }

    // Fallback to template
    setAnswer(templateAnswer);
    setPhase('answered');
  }, [partner, report, question, activeProfile]);

  // ---- Back to selection ----
  const handleBack = useCallback(() => {
    playClick();
    setPhase('select');
    setPartner(null);
    setReport(null);
    setReading(null);
    setTodaysBond(null);
    setAnswer(null);
    setQuestion('');
    setQuestionError(null);
  }, []);

  // ---- Enter question mode ----
  const handleAskMode = useCallback(() => {
    playClick();
    setQuestion('');
    setQuestionError(null);
    setAnswer(null);
    setPhase('asking');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // ---- Submit question ----
  const handleSubmitQuestion = useCallback(() => {
    if (phase !== 'asking') return;

    const validation = validateQuestionInput(question);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Ask a meaningful question');
      return;
    }

    setQuestionError(null);
    playClick();

    // Fire LLM call NOW — it runs during the gazing animation (~3s)
    const trimmed = question.trim();
    const qMode = detectQuestionMode(trimmed);

    if (partner && report) {
      // For directional questions, compute verdict from template system to pass to LLM
      let verdict: string | undefined;
      if (qMode === 'directional') {
        const templateAnswer = answerRelationshipQuestion(trimmed, activeProfile, partner, report);
        verdict = templateAnswer.verdict;
      }
      llmPromiseRef.current = callBondLLM(
        trimmed, qMode, activeProfile, partner, report, todaysBond, verdict
      );
    } else {
      llmPromiseRef.current = null;
    }

    setPhase('gazing');
  }, [phase, question, partner, report, activeProfile, todaysBond]);

  // ---- Select suggested question ----
  const handleSuggestedQuestion = useCallback((q: string) => {
    setQuestion(q);
    if (phase !== 'asking') return;

    const validation = validateQuestionInput(q);
    if (!validation.valid) return;

    playClick();

    // Fire LLM call NOW — same pattern as handleSubmitQuestion
    const trimmed = q.trim();
    const qMode = detectQuestionMode(trimmed);

    if (partner && report) {
      let verdict: string | undefined;
      if (qMode === 'directional') {
        const templateAnswer = answerRelationshipQuestion(trimmed, activeProfile, partner, report);
        verdict = templateAnswer.verdict;
      }
      llmPromiseRef.current = callBondLLM(
        trimmed, qMode, activeProfile, partner, report, todaysBond, verdict
      );
    } else {
      llmPromiseRef.current = null;
    }

    setPhase('gazing');
  }, [phase, partner, report, activeProfile, todaysBond]);

  // ---- Input handlers ----
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
    if (questionError) setQuestionError(null);
  }, [questionError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      inputRef.current?.blur();
      handleSubmitQuestion();
    }
  }, [handleSubmitQuestion]);

  const handleInputFocus = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, []);

  // ---- Back to reading from asking/answered ----
  const handleBackToReading = useCallback(() => {
    playClick();
    setAnswer(null);
    setPhase('reading');
  }, []);

  // Scroll reading into view when it appears
  useEffect(() => {
    if (phase === 'reading' && readingRef.current) {
      setTimeout(() => {
        readingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [phase]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="compat-view">
      {/* ---- Pair label above the eye ---- */}
      {pairLabel && phase !== 'select' && (
        <div className="compat-pair-label">
          <span className="compat-pair-soul">
            <span className="compat-pair-symbol">{pairLabel.symbol1}</span>
            <span className="compat-pair-name">{pairLabel.name1}</span>
          </span>
          <span className="compat-pair-divider">{'\u00D7'}</span>
          <span className="compat-pair-soul">
            <span className="compat-pair-symbol">{pairLabel.symbol2}</span>
            <span className="compat-pair-name">{pairLabel.name2}</span>
          </span>
        </div>
      )}

      {/* ---- Header text when selecting ---- */}
      {phase === 'select' && (
        <p className="compat-header">Choose a soul to compare</p>
      )}

      {/* ---- THE SEER EYE — always present ---- */}
      <div className="compat-eye-section">
        <SeerEye
          state={getEyeState()}
          onOpenComplete={handleEyeOpenComplete}
          onGazeComplete={handleGazeComplete}
        />
      </div>

      {/* ---- Gazing question echo ---- */}
      {phase === 'gazing' && question && (
        <p className="compat-current-question">"{question}"</p>
      )}

      {/* ---- Phase: Select (below eye) ---- */}
      {phase === 'select' && (
        <>
          {hasOthers ? (
            <div className="compat-profile-list">
              {others.map((profile) => {
                const sunSign = profile.natalChart.sun.sign;
                const symbol = ZODIAC_SYMBOLS[sunSign];
                return (
                  <button
                    key={profile.id}
                    className="compat-profile-btn"
                    onClick={() => handleSelectPartner(profile)}
                  >
                    <span className="compat-profile-symbol">{symbol}</span>
                    <div className="compat-profile-info">
                      <span className="compat-profile-name">{profile.birthData.name}</span>
                      <span className="compat-profile-sign">{sunSign}</span>
                    </div>
                    <span className="compat-profile-arrow">{'\u203A'}</span>
                  </button>
                );
              })}
              <button className="compat-add-btn compat-add-btn--inline" onClick={onAddProfile}>
                + Add Profile
              </button>
            </div>
          ) : (
            <div className="compat-empty">
              <p className="compat-empty-text">
                Add a second soul to reveal what lies between you
              </p>
              <button className="compat-add-btn" onClick={onAddProfile}>
                + Add Profile
              </button>
            </div>
          )}
        </>
      )}

      {/* ---- Phase: Reading revealed (below eye) ---- */}
      {phase === 'reading' && report && reading && (
        <div className="compat-reading-container" ref={readingRef}>
          {/* Tier badge */}
          <div className="compat-tier" style={{ color: getTierColor(report.tier) }}>
            {getTierLabel(report.tier)}
          </div>

          {/* Score */}
          <div className="compat-score" style={{ color: getTierColor(report.tier) }}>
            <span className="compat-score-num">{report.score}</span>
            <span className="compat-score-label">Cosmic Resonance</span>
          </div>

          {/* Oracle verdict */}
          <p className="compat-verdict" style={{ color: getTierColor(report.tier) }}>
            {report.oracleVerdict}
          </p>

          {/* Reading text */}
          <div className="compat-reading-text">
            {reading.fullText.split('\n\n').filter(Boolean).map((p, i) => (
              <p key={i} className="compat-reading-paragraph">{p}</p>
            ))}
          </div>

          {/* Strengths */}
          {report.strengths.length > 0 && (
            <div className="compat-section">
              <h3 className="compat-section-label">What Draws You Together</h3>
              {report.strengths.map((s, i) => (
                <p key={i} className="compat-section-item compat-section-item--strength">{s}</p>
              ))}
            </div>
          )}

          {/* Challenges */}
          {report.challenges.length > 0 && (
            <div className="compat-section">
              <h3 className="compat-section-label">What Tests You</h3>
              {report.challenges.map((c, i) => (
                <p key={i} className="compat-section-item compat-section-item--challenge">{c}</p>
              ))}
            </div>
          )}

          {/* Theme pills */}
          {(() => {
            const topThemes = report.themes.filter(t => t.score > 2).slice(0, 5);
            return topThemes.length > 0 ? (
              <div className="compat-themes">
                {topThemes.map((t) => (
                  <span
                    key={t.theme}
                    className="compat-theme-pill"
                    style={{ borderColor: `${getTierColor(report.tier)}33`, color: getTierColor(report.tier) }}
                  >
                    {t.label}
                    <span className="compat-theme-score">
                      {t.score >= 7 ? 'strong' : t.score >= 4 ? 'present' : 'subtle'}
                    </span>
                  </span>
                ))}
              </div>
            ) : null;
          })()}

          {/* Element harmony */}
          <div className="compat-element">
            <h3 className="compat-section-label">Elemental Harmony</h3>
            <p className="compat-element-text">{report.elementHarmony.description}</p>
          </div>

          {/* Today's Bond — daily layer, separated from permanent reading */}
          {todaysBond && <TodaysBond data={todaysBond} />}

          {/* Actions */}
          <div className="compat-actions">
            <button className="compat-ask-btn" onClick={handleAskMode}>
              Ask about this bond
            </button>
            <button className="compat-back-link" onClick={handleBack}>
              Choose another soul
            </button>
          </div>
        </div>
      )}

      {/* ---- Phase: Question input (below eye) ---- */}
      {phase === 'asking' && (
        <div className="compat-input-container">
          <div className="compat-question-form">
            <div className="compat-question-row">
              <input
                ref={inputRef}
                type="search"
                name="seer-compat-question"
                className={`compat-question-input ${questionError ? 'has-error' : ''}`}
                value={question}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                placeholder="Will this work between us?"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                enterKeyHint="go"
                data-form-type="other"
                data-lpignore="true"
              />
              <button
                className="compat-submit-btn"
                onClick={handleSubmitQuestion}
                disabled={!question.trim()}
                type="button"
              >
                Ask
              </button>
            </div>
            {questionError && <div className="compat-input-error">{questionError}</div>}
          </div>

          {/* Suggested questions */}
          <p className="compat-suggestions-divider">or ask the stars</p>
          <div className="compat-suggestions">
            {suggestions.map((q) => (
              <button
                key={q}
                className="compat-suggestion-chip"
                onClick={() => handleSuggestedQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>

          <button className="compat-back-link" onClick={handleBackToReading}>
            Back to reading
          </button>
        </div>
      )}

      {/* ---- Phase: Answer shown (below eye) ---- */}
      {phase === 'answered' && answer && (() => {
        const isGuidance = bondQuestionMode === 'guidance';
        const answerColor = isGuidance ? '#C9A84C' : getCompatibilityVerdictColor(answer.verdict);
        return (
        <div className="compat-answer-container">
          {/* Verdict — skip for guidance (open-ended) questions */}
          {!isGuidance && (
            <div className="compat-answer-verdict" style={{ color: answerColor }}>
              {getCompatibilityVerdictText(answer.verdict)}
            </div>
          )}

          {/* Response */}
          <div className="compat-answer-text" style={{ color: answerColor }}>
            <span className="compat-answer-quote">{'\u201C'}</span>
            {answer.response}
            <span className="compat-answer-quote">{'\u201D'}</span>
          </div>

          {/* Transit context */}
          {answer.transitContext && (
            <p className="compat-transit-context">{answer.transitContext}</p>
          )}

          {/* Actions */}
          <div className="compat-answer-actions">
            <button className="compat-ask-btn" onClick={handleAskMode}>
              Ask another
            </button>
            <button className="compat-back-link" onClick={handleBackToReading}>
              Back to reading
            </button>
            <button className="compat-back-link" onClick={handleBack}>
              Choose another soul
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
