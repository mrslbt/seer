import { useState, useCallback, useRef, useEffect } from 'react';
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
import { ZODIAC_SYMBOLS } from '../lib/astroEngine';
import { playClick, playReveal } from '../lib/sounds';
import { validateQuestionInput } from './QuestionInput';
import './CompatibilityView.css';

// ============================================
// TYPES
// ============================================

interface CompatibilityViewProps {
  activeProfile: UserProfile;
  allProfiles: UserProfile[];
  onAddProfile: () => void;
}

type ViewState =
  | { phase: 'select' }
  | { phase: 'pre-reveal'; partner: UserProfile }
  | { phase: 'gazing'; partner: UserProfile; report: SynastryReport }
  | { phase: 'reading'; partner: UserProfile; report: SynastryReport; reading: CompatibilityReading }
  | { phase: 'asking'; partner: UserProfile; report: SynastryReport; reading: CompatibilityReading }
  | { phase: 'answering'; partner: UserProfile; report: SynastryReport; reading: CompatibilityReading }
  | { phase: 'answered'; partner: UserProfile; report: SynastryReport; reading: CompatibilityReading; answer: RelationshipAnswer };

// ============================================
// SUGGESTED RELATIONSHIP QUESTIONS
// ============================================

const RELATIONSHIP_QUESTIONS = [
  'Are we truly compatible?',
  'Is there real chemistry between us?',
  'Will this last?',
  'Can I trust them?',
  'Is now the right time?',
  'Are they serious about me?',
  'Will we fight a lot?',
];

function getRandomQuestions(count: number): string[] {
  const shuffled = [...RELATIONSHIP_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// GAZING DURATION
// ============================================

const GAZE_DURATION = 2800;

// ============================================
// COMPONENT
// ============================================

export function CompatibilityView({ activeProfile, allProfiles, onAddProfile }: CompatibilityViewProps) {
  const [state, setState] = useState<ViewState>({ phase: 'select' });
  const [question, setQuestion] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [suggestions] = useState(() => getRandomQuestions(4));
  const inputRef = useRef<HTMLInputElement>(null);
  const readingRef = useRef<HTMLDivElement>(null);
  const gazeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Others = all profiles minus active
  const others = allProfiles.filter(p => p.id !== activeProfile.id);
  const hasOthers = others.length > 0;

  // Clean up gaze timer on unmount
  useEffect(() => {
    return () => {
      if (gazeTimerRef.current) clearTimeout(gazeTimerRef.current);
    };
  }, []);

  // ---- Select partner ----
  const handleSelectPartner = useCallback((partner: UserProfile) => {
    playClick();
    setState({ phase: 'pre-reveal', partner });
  }, []);

  // ---- Reveal ----
  const handleReveal = useCallback(() => {
    if (state.phase !== 'pre-reveal') return;
    playClick();

    const report = calculateSynastry(activeProfile, state.partner);
    setState({ phase: 'gazing', partner: state.partner, report });

    gazeTimerRef.current = setTimeout(() => {
      playReveal();
      const reading = generateCompatibilityReading(report);
      setState({ phase: 'reading', partner: state.partner, report, reading });
    }, GAZE_DURATION);
  }, [state, activeProfile]);

  // ---- Back to selection ----
  const handleBack = useCallback(() => {
    playClick();
    setState({ phase: 'select' });
    setQuestion('');
    setQuestionError(null);
  }, []);

  // ---- Enter question mode ----
  const handleAskMode = useCallback(() => {
    if (state.phase !== 'reading' && state.phase !== 'answered') return;
    playClick();
    setQuestion('');
    setQuestionError(null);
    setState({
      phase: 'asking',
      partner: state.partner,
      report: state.report,
      reading: state.reading,
    });
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [state]);

  // ---- Submit question ----
  const handleSubmitQuestion = useCallback(() => {
    if (state.phase !== 'asking') return;

    const validation = validateQuestionInput(question);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Ask a meaningful question');
      return;
    }

    setQuestionError(null);
    playClick();

    // Show gazing state briefly
    setState({
      phase: 'answering',
      partner: state.partner,
      report: state.report,
      reading: state.reading,
    });

    gazeTimerRef.current = setTimeout(() => {
      playReveal();
      const answer = answerRelationshipQuestion(
        question,
        activeProfile,
        state.partner,
        state.report,
      );
      setState({
        phase: 'answered',
        partner: state.partner,
        report: state.report,
        reading: state.reading,
        answer,
      });
    }, 2000);
  }, [state, question, activeProfile]);

  // ---- Select suggested question ----
  const handleSuggestedQuestion = useCallback((q: string) => {
    setQuestion(q);
    // Submit immediately after setting
    if (state.phase !== 'asking') return;

    const validation = validateQuestionInput(q);
    if (!validation.valid) return;

    playClick();
    setState({
      phase: 'answering',
      partner: state.partner,
      report: state.report,
      reading: state.reading,
    });

    gazeTimerRef.current = setTimeout(() => {
      playReveal();
      const answer = answerRelationshipQuestion(
        q,
        activeProfile,
        state.partner,
        state.report,
      );
      setState({
        phase: 'answered',
        partner: state.partner,
        report: state.report,
        reading: state.reading,
        answer,
      });
    }, 2000);
  }, [state, activeProfile]);

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

  // ============================================
  // RENDER: State 1 — Profile Selection
  // ============================================

  if (state.phase === 'select') {
    return (
      <div className="compat-view">
        <h2 className="compat-header">Choose a soul to compare</h2>

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
      </div>
    );
  }

  // ============================================
  // RENDER: State 2 — Pre-reveal (side by side)
  // ============================================

  if (state.phase === 'pre-reveal') {
    const activeSun = activeProfile.natalChart.sun.sign;
    const partnerSun = state.partner.natalChart.sun.sign;

    return (
      <div className="compat-view">
        <div className="compat-pair">
          <div className="compat-soul">
            <span className="compat-soul-symbol">{ZODIAC_SYMBOLS[activeSun]}</span>
            <span className="compat-soul-name">{activeProfile.birthData.name}</span>
            <span className="compat-soul-sign">{activeSun}</span>
          </div>

          <div className="compat-divider">{'\u00D7'}</div>

          <div className="compat-soul">
            <span className="compat-soul-symbol">{ZODIAC_SYMBOLS[partnerSun]}</span>
            <span className="compat-soul-name">{state.partner.birthData.name}</span>
            <span className="compat-soul-sign">{partnerSun}</span>
          </div>
        </div>

        <button className="compat-reveal-btn" onClick={handleReveal}>
          Reveal
        </button>

        <button className="compat-back-link" onClick={handleBack}>
          Choose another soul
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER: Gazing states
  // ============================================

  if (state.phase === 'gazing' || state.phase === 'answering') {
    return (
      <div className="compat-view">
        <div className="compat-gazing">
          <div className="compat-gazing-orb" />
          <p className="compat-gazing-text">
            {state.phase === 'gazing'
              ? 'The Seer gazes into the bond...'
              : 'The Seer contemplates...'}
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: State 3 — Reading revealed
  // ============================================

  if (state.phase === 'reading') {
    const { report, reading } = state;
    const tierLabel = getTierLabel(report.tier);
    const tierColor = getTierColor(report.tier);
    const paragraphs = reading.fullText.split('\n\n').filter(Boolean);
    // Top themes (score > 0, max 5)
    const topThemes = report.themes.filter(t => t.score > 2).slice(0, 5);

    return (
      <div className="compat-view" ref={readingRef}>
        {/* Tier badge */}
        <div className="compat-tier" style={{ color: tierColor }}>
          {tierLabel}
        </div>

        {/* Score — subtle */}
        <div className="compat-score" style={{ color: tierColor }}>
          <span className="compat-score-num">{report.score}</span>
          <span className="compat-score-max">/100</span>
        </div>

        {/* Oracle verdict */}
        <p className="compat-verdict" style={{ color: tierColor }}>
          {report.oracleVerdict}
        </p>

        {/* Reading text */}
        <div className="compat-reading-text">
          {paragraphs.map((p, i) => (
            <p key={i} className="compat-reading-paragraph">{p}</p>
          ))}
        </div>

        {/* Theme pills */}
        {topThemes.length > 0 && (
          <div className="compat-themes">
            {topThemes.map((t) => (
              <span
                key={t.theme}
                className="compat-theme-pill"
                style={{ borderColor: `${tierColor}33`, color: tierColor }}
              >
                {t.label}
                <span className="compat-theme-score">{t.score.toFixed(1)}</span>
              </span>
            ))}
          </div>
        )}

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

        {/* Element harmony */}
        <div className="compat-element">
          <h3 className="compat-section-label">Elemental Harmony</h3>
          <p className="compat-element-text">{report.elementHarmony.description}</p>
        </div>

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
    );
  }

  // ============================================
  // RENDER: State 4 — Question mode
  // ============================================

  if (state.phase === 'asking') {
    return (
      <div className="compat-view">
        <h2 className="compat-question-header">
          Ask about the bond between you
        </h2>

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

        <button className="compat-back-link" onClick={() => {
          playClick();
          setState({
            phase: 'reading',
            partner: state.partner,
            report: state.report,
            reading: state.reading,
          });
        }}>
          Back to reading
        </button>
      </div>
    );
  }

  // ============================================
  // RENDER: State 5 — Answer shown
  // ============================================

  if (state.phase === 'answered') {
    const { answer } = state;
    const verdictText = getCompatibilityVerdictText(answer.verdict);
    const verdictColor = getCompatibilityVerdictColor(answer.verdict);

    return (
      <div className="compat-view">
        {/* Verdict */}
        <div className="compat-answer-verdict" style={{ color: verdictColor }}>
          {verdictText}
        </div>

        {/* Response */}
        <div className="compat-answer-text" style={{ color: verdictColor }}>
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
          <button className="compat-back-link" onClick={() => {
            playClick();
            setState({
              phase: 'reading',
              partner: state.partner,
              report: state.report,
              reading: state.reading,
            });
          }}>
            Back to reading
          </button>
          <button className="compat-back-link" onClick={handleBack}>
            Choose another soul
          </button>
        </div>
      </div>
    );
  }

  return null;
}
