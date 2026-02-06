import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BirthData, AstroContext, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { scoreDecision } from './lib/scoreDecision';
import { playClick, playVerdictSound, playReveal, setMuted } from './lib/sounds';
import { generateOracleResponse } from './lib/oracleResponse';
import { generateInsightArticle } from './lib/insightArticle';
import type { InsightArticle } from './lib/insightArticle';

import { usePersonalCosmos } from './hooks/usePersonalCosmos';
import { scorePersonalDecision } from './lib/personalScoreDecision';

import { BirthDataForm } from './components/BirthDataForm';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { OracleReading } from './components/OracleReading';

import './App.css';

type AppState = 'idle' | 'summoning' | 'awaiting_question' | 'gazing' | 'revealing';

function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [birthData, setBirthData] = useState<BirthData | null>(null);
  const [astroContext, setAstroContext] = useState<AstroContext | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [oracleVerdict, setOracleVerdict] = useState<Verdict>('NEUTRAL');
  const [oracleCategory, setOracleCategory] = useState<QuestionCategory>('decisions');
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    isInitialized: cosmosReady,
    dailyReport,
    setUserFromOldBirthData,
    userProfile
  } = usePersonalCosmos();

  const hasBirthData = birthData !== null;

  // Generate the insight article when we have a category and daily report
  const insightArticle: InsightArticle | null = useMemo(() => {
    if (appState === 'revealing' && dailyReport && oracleCategory) {
      return generateInsightArticle(oracleCategory, dailyReport);
    }
    return null;
  }, [appState, dailyReport, oracleCategory]);

  // Load saved birth data
  useEffect(() => {
    const saved = localStorage.getItem('seer_birthdata');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.date = new Date(parsed.date);
        setBirthData(parsed);
        const context = generateAstroContext(parsed, new Date());
        setAstroContext(context);
      } catch {
        localStorage.removeItem('seer_birthdata');
      }
    }
  }, []);

  // Sync birth data to personalized cosmos
  useEffect(() => {
    if (cosmosReady && birthData && !userProfile) {
      setUserFromOldBirthData(birthData);
    }
  }, [cosmosReady, birthData, userProfile, setUserFromOldBirthData]);

  // Handle birth data submission
  const handleBirthDataSubmit = useCallback(async (data: BirthData) => {
    playClick();
    setBirthData(data);
    localStorage.setItem('seer_birthdata', JSON.stringify(data));

    const context = generateAstroContext(data, new Date());
    setAstroContext(context);

    if (cosmosReady) {
      await setUserFromOldBirthData(data);
    }

    setShowSettings(false);
  }, [cosmosReady, setUserFromOldBirthData]);

  // Summon the seer
  const handleSummon = useCallback(() => {
    if (!hasBirthData) return;
    playClick();
    setAppState('summoning');
  }, [hasBirthData]);

  // Eye finished opening
  const handleEyeOpenComplete = useCallback(() => {
    playReveal();
    setAppState('awaiting_question');
  }, []);

  // Submit question
  const handleSubmitQuestion = useCallback(() => {
    const validation = validateQuestionInput(questionText);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Invalid question');
      return;
    }

    setQuestionError(null);
    playClick();
    setSubmittedQuestion(questionText.trim());
    setAppState('gazing');
  }, [questionText]);

  // Eye finished gazing - generate reading
  const handleGazeComplete = useCallback(() => {
    if (!astroContext) return;

    setAppState('revealing');

    let verdict: Verdict;
    let category: QuestionCategory;

    if (dailyReport && userProfile) {
      const personalScoring = scorePersonalDecision(submittedQuestion, dailyReport);
      verdict = personalScoring.verdict;
      category = personalScoring.category;
    } else {
      const scoring = scoreDecision(submittedQuestion, astroContext);
      verdict = scoring.verdict;
      category = scoring.category;
    }

    const response = generateOracleResponse(verdict, category);
    setOracleText(response);
    setOracleVerdict(verdict);
    setOracleCategory(category);

    setTimeout(() => {
      playVerdictSound(verdict);
    }, 300);
  }, [astroContext, submittedQuestion, dailyReport, userProfile]);

  // Dismiss reading (go back to idle)
  const handleDismiss = useCallback(() => {
    setAppState('idle');
    setOracleText('');
    setSubmittedQuestion('');
    setQuestionText('');
  }, []);

  // Ask again (go back to awaiting question with eye open)
  const handleAskAgain = useCallback(() => {
    playClick();
    setOracleText('');
    setSubmittedQuestion('');
    setQuestionText('');
    setAppState('awaiting_question');
  }, []);

  // Clear error when typing
  const handleQuestionChange = useCallback((value: string) => {
    setQuestionText(value);
    if (questionError) setQuestionError(null);
  }, [questionError]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMuted(newMuted);
    if (!newMuted) playClick();
  }, [isMuted]);

  // Determine eye state
  const getEyeState = (): 'closed' | 'opening' | 'open' | 'gazing' | 'revealing' => {
    switch (appState) {
      case 'idle': return 'closed';
      case 'summoning': return 'opening';
      case 'awaiting_question': return 'open';
      case 'gazing': return 'gazing';
      case 'revealing': return 'open';
      default: return 'closed';
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <button className="header-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
        {hasBirthData && (
          <button className="header-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            \u2699\uFE0F
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* First visit - show birth form inline */}
        {!hasBirthData && !showSettings && (
          <div className="onboarding">
            <div className="onboarding-title">
              <span className="title-the">The</span>
              <span className="title-seer">Seer</span>
            </div>
            <div className="onboarding-form">
              <BirthDataForm onSubmit={handleBirthDataSubmit} />
            </div>
          </div>
        )}

        {/* Main seer interface */}
        {hasBirthData && (
          <>
            {/* The Eye */}
            <div className="eye-section">
              <SeerEye
                state={getEyeState()}
                onOpenComplete={handleEyeOpenComplete}
                onGazeComplete={handleGazeComplete}
              />
            </div>

            {/* Submitted question while gazing */}
            {(appState === 'gazing') && (
              <p className="current-question">"{submittedQuestion}"</p>
            )}

            {/* Summon button - only in idle state */}
            {appState === 'idle' && (
              <button className="summon-btn" onClick={handleSummon}>
                Summon
              </button>
            )}

            {/* Question input - only when eye is open */}
            {appState === 'awaiting_question' && (
              <div className="input-container">
                <QuestionInput
                  value={questionText}
                  onChange={handleQuestionChange}
                  onSubmit={handleSubmitQuestion}
                  disabled={false}
                  error={questionError}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Settings modal */}
      {showSettings && hasBirthData && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Birth Details</h2>
              <button className="close-btn" onClick={() => setShowSettings(false)}>x</button>
            </div>
            <BirthDataForm
              onSubmit={handleBirthDataSubmit}
              initialData={birthData}
            />
          </div>
        </div>
      )}

      {/* Oracle reading overlay */}
      {appState === 'revealing' && oracleText && (
        <OracleReading
          oracleText={oracleText}
          verdict={oracleVerdict}
          article={insightArticle}
          onAskAgain={handleAskAgain}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

export default App;
