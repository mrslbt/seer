import { useState, useCallback, useEffect } from 'react';
import type { BirthData, AstroContext, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { scoreDecision } from './lib/scoreDecision';
import { playClick, playVerdictSound, playReveal, setMuted } from './lib/sounds';
import { generateOracleResponse } from './lib/oracleResponse';
import { generateInsightArticle, generateFallbackArticle } from './lib/insightArticle';
import type { InsightArticle } from './lib/insightArticle';

import { usePersonalCosmos } from './hooks/usePersonalCosmos';
import { scorePersonalDecision } from './lib/personalScoreDecision';

import { BirthDataForm } from './components/BirthDataForm';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { OracleReading } from './components/OracleReading';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { CosmicDashboard } from './components/CosmicDashboard';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';

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
  const [oracleArticle, setOracleArticle] = useState<InsightArticle | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const {
    isInitialized: cosmosReady,
    isLoading: cosmosLoading,
    error: cosmosError,
    dailyReport,
    setUserFromOldBirthData,
    refreshDailyReport,
    userProfile
  } = usePersonalCosmos();

  const hasBirthData = birthData !== null;

  // Auto-refresh dashboard data every 30 minutes while visible
  useDashboardRefresh(showDashboard, refreshDailyReport);

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

  // Eye finished opening — if question is waiting, go to gazing; otherwise await input
  const handleEyeOpenComplete = useCallback(() => {
    playReveal();
    if (submittedQuestion) {
      setAppState('gazing');
    } else {
      setAppState('awaiting_question');
    }
  }, [submittedQuestion]);

  // Submit question — works from both idle and awaiting_question states
  const handleSubmitQuestion = useCallback(() => {
    const validation = validateQuestionInput(questionText);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Invalid question');
      return;
    }

    setQuestionError(null);
    playClick();
    setSubmittedQuestion(questionText.trim());

    if (appState === 'idle') {
      // Eye is closed — open it, then gaze
      setAppState('summoning');
    } else {
      // Eye is already open — go straight to gazing
      setAppState('gazing');
    }
  }, [questionText, appState]);

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

    // Generate the insight article
    if (dailyReport) {
      setOracleArticle(generateInsightArticle(category, dailyReport));
    } else if (astroContext) {
      setOracleArticle(generateFallbackArticle(category, verdict, astroContext));
    }

    setTimeout(() => {
      playVerdictSound(verdict);
    }, 300);
  }, [astroContext, submittedQuestion, dailyReport, userProfile]);

  // Dismiss reading (go back to idle)
  const handleDismiss = useCallback(() => {
    setAppState('idle');
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
  }, []);

  // Ask again (go back to awaiting question with eye open)
  const handleAskAgain = useCallback(() => {
    playClick();
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setAppState('awaiting_question');
  }, []);

  // Select a pre-made suggestion — works from idle or awaiting_question
  const handleSuggestedSelect = useCallback((question: string) => {
    playClick();
    setQuestionText(question);
    setQuestionError(null);
    setSubmittedQuestion(question);

    if (appState === 'idle') {
      setAppState('summoning'); // Open eye first, then gaze
    } else {
      setAppState('gazing');
    }
  }, [appState]);

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
        {hasBirthData && dailyReport && appState !== 'revealing' && (
          <button className="header-btn" onClick={() => { playClick(); setShowDashboard(true); }} aria-label="Cosmic Dashboard">
            {'\u2728'}
          </button>
        )}
        {hasBirthData && (
          <button className="header-btn" onClick={() => setShowSettings(true)} aria-label="Settings">
            {'\u2699\uFE0F'}
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

        {/* Loading indicator while cosmos engine initializes */}
        {hasBirthData && cosmosLoading && appState === 'idle' && (
          <p className="cosmos-status">Aligning the cosmos...</p>
        )}

        {/* Cosmos error - non-blocking, show subtle warning */}
        {hasBirthData && cosmosError && !cosmosLoading && (
          <p className="cosmos-status cosmos-status--warn">Readings may be less precise today</p>
        )}

        {/* Main seer interface */}
        {hasBirthData && (
          <>
            {/* Branding - visible when idle or awaiting question */}
            {(appState === 'idle' || appState === 'awaiting_question') && (
              <div className="seer-brand">
                <span className="brand-the">The</span>
                <span className="brand-seer">Seer</span>
              </div>
            )}

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

            {/* Question input - visible in idle AND awaiting_question */}
            {(appState === 'idle' || appState === 'awaiting_question') && (
              <div className="input-container">
                <QuestionInput
                  value={questionText}
                  onChange={handleQuestionChange}
                  onSubmit={handleSubmitQuestion}
                  disabled={false}
                  error={questionError}
                />
                <SuggestedQuestions onSelect={handleSuggestedSelect} />
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

      {/* Cosmic Dashboard overlay */}
      {showDashboard && dailyReport && (
        <CosmicDashboard
          report={dailyReport}
          onClose={() => setShowDashboard(false)}
          onRefresh={refreshDailyReport}
        />
      )}

      {/* Oracle reading overlay */}
      {appState === 'revealing' && oracleText && (
        <OracleReading
          oracleText={oracleText}
          verdict={oracleVerdict}
          article={oracleArticle}
          onAskAgain={handleAskAgain}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

export default App;
