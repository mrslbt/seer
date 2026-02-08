import { useState, useCallback, useEffect, useMemo } from 'react';
import type { BirthData, AstroContext, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { scoreDecision } from './lib/scoreDecision';
import { playClick, playVerdictSound, playReveal, setMuted } from './lib/sounds';
import { generateOracleResponse } from './lib/oracleResponse';
import { generateInsightArticle, generateFallbackArticle } from './lib/insightArticle';
import type { InsightArticle } from './lib/insightArticle';

import { usePersonalCosmos } from './hooks/usePersonalCosmos';
import { scorePersonalDecision } from './lib/personalScoreDecision';
import { getDailyWhisper } from './lib/cosmicWhisper';
import { saveReading, analyzePatterns } from './lib/readingHistory';

import { BirthDataForm } from './components/BirthDataForm';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { OracleReading } from './components/OracleReading';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { CosmicDashboard } from './components/CosmicDashboard';
import { ReadingHistory } from './components/ReadingHistory';
import { CategorySelector } from './components/CategorySelector';
import { NatalChartView } from './components/NatalChartView';
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
  const [oracleCategory, setOracleCategory] = useState<QuestionCategory>('decisions');
  const [oracleArticle, setOracleArticle] = useState<InsightArticle | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);

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

  // ---- Cosmic Whisper (Feature 1) ----
  const cosmicWhisper = useMemo(() => {
    if (!dailyReport) return null;
    return getDailyWhisper(dailyReport);
  }, [dailyReport]);

  // ---- Daily Cosmic Mood (Feature 2) ----
  // Pass overall score to influence eye ambient glow
  const cosmicMoodScore = dailyReport?.overallScore ?? 5;

  // ---- Transit Alerts (Feature 4) ----
  const hasTransitAlert = useMemo(() => {
    if (!dailyReport) return false;
    // Check if any transit is exact (within 1 degree)
    return dailyReport.keyTransits.some(t => t.transit.isExact);
  }, [dailyReport]);

  // ---- Retrograde Countdown (Feature 7) ----
  const activeRetrogrades = dailyReport?.retrogrades ?? [];

  // ---- Moon Phase Ritual (Feature 8) ----
  const isSpecialMoonPhase = useMemo(() => {
    if (!dailyReport) return null;
    const name = dailyReport.moonPhase.name;
    if (name === 'New Moon' || name === 'Full Moon') return name;
    return null;
  }, [dailyReport]);

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
      const personalScoring = scorePersonalDecision(submittedQuestion, dailyReport, selectedCategory ?? undefined);
      verdict = personalScoring.verdict;
      category = personalScoring.category;
    } else {
      const scoring = scoreDecision(submittedQuestion, astroContext, selectedCategory ?? undefined);
      verdict = scoring.verdict;
      category = scoring.category;
    }

    const readingPatterns = analyzePatterns();
    const response = generateOracleResponse(verdict, category, dailyReport, submittedQuestion, readingPatterns);
    setOracleText(response);
    setOracleVerdict(verdict);
    setOracleCategory(category);

    // Generate the insight article
    if (dailyReport) {
      setOracleArticle(generateInsightArticle(category, dailyReport));
    } else if (astroContext) {
      setOracleArticle(generateFallbackArticle(category, verdict, astroContext));
    }

    // Save to reading history (Feature 3)
    saveReading({
      question: submittedQuestion,
      verdict,
      oracleText: response,
      category,
      moonPhase: dailyReport?.moonPhase.name,
      overallScore: dailyReport?.overallScore,
    });

    setTimeout(() => {
      playVerdictSound(verdict);
    }, 300);
  }, [astroContext, submittedQuestion, dailyReport, userProfile, selectedCategory]);

  // Dismiss reading (go back to idle)
  const handleDismiss = useCallback(() => {
    setAppState('idle');
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setSelectedCategory(null);
  }, []);

  // Ask again (go back to awaiting question with eye open)
  const handleAskAgain = useCallback(() => {
    playClick();
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setSelectedCategory(null);
    setAppState('awaiting_question');
  }, []);

  // Select a pre-made suggestion
  const handleSuggestedSelect = useCallback((question: string) => {
    playClick();
    setQuestionText(question);
    setQuestionError(null);
    setSubmittedQuestion(question);
    setAppState('gazing');
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

  // Cosmic mood CSS class for eye glow (Feature 2)
  const cosmicMoodClass = cosmicMoodScore >= 8 ? 'mood-excellent'
    : cosmicMoodScore >= 6 ? 'mood-good'
    : cosmicMoodScore >= 4 ? 'mood-mixed'
    : 'mood-challenging';

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <button className="header-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? '\u{1F507}' : '\u{1F50A}'}
        </button>
        {hasBirthData && dailyReport && appState !== 'revealing' && (
          <button
            className={`header-btn ${hasTransitAlert ? 'header-btn--alert' : ''}`}
            onClick={() => { playClick(); setShowDashboard(true); }}
            aria-label="Cosmic Dashboard"
          >
            {'\u2728'}
            {hasTransitAlert && <span className="transit-alert-dot" />}
          </button>
        )}
        {hasBirthData && (
          <button
            className="header-btn"
            onClick={() => { playClick(); setShowHistory(true); }}
            aria-label="Reading History"
          >
            {'\u{1F4DC}'}
          </button>
        )}
        {hasBirthData && userProfile && (
          <button
            className="header-btn"
            onClick={() => { playClick(); setShowChart(true); }}
            aria-label="Your Chart"
          >
            {'\u{1FA90}'}
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
            {/* Branding */}
            {(appState === 'idle' || appState === 'awaiting_question') && (
              <div className="seer-brand">
                <span className="brand-the">The</span>
                <span className="brand-seer">Seer</span>
              </div>
            )}

            {/* The Eye — with cosmic mood class */}
            <div className={`eye-section ${cosmicMoodClass}`}>
              <SeerEye
                state={getEyeState()}
                onOpenComplete={handleEyeOpenComplete}
                onGazeComplete={handleGazeComplete}
              />
            </div>

            {/* Cosmic Whisper (Feature 1) — shown below the eye in idle state */}
            {appState === 'idle' && cosmicWhisper && !cosmosLoading && (
              <p className="cosmic-whisper">{cosmicWhisper}</p>
            )}

            {/* Retrograde Alert (Feature 7) — shown in idle state */}
            {appState === 'idle' && activeRetrogrades.length > 0 && !cosmosLoading && (
              <div className="retrograde-alert">
                {activeRetrogrades.map(r => (
                  <span key={r.planet} className="retrograde-badge">
                    {r.planet.charAt(0).toUpperCase() + r.planet.slice(1)} Rx
                  </span>
                ))}
              </div>
            )}

            {/* Moon Phase Ritual (Feature 8) — shown on new/full moons */}
            {appState === 'idle' && isSpecialMoonPhase && !cosmosLoading && (
              <div className="moon-ritual-hint">
                <span className="moon-ritual-icon">{isSpecialMoonPhase === 'New Moon' ? '\u{1F311}' : '\u{1F315}'}</span>
                <span className="moon-ritual-text">
                  {isSpecialMoonPhase === 'New Moon'
                    ? 'New Moon — Set intentions. Ask what to begin.'
                    : 'Full Moon — Seek clarity. Ask what to release.'}
                </span>
              </div>
            )}

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
                <CategorySelector
                  selected={selectedCategory}
                  onSelect={setSelectedCategory}
                />
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

      {/* Reading History overlay (Feature 3) */}
      {showHistory && (
        <ReadingHistory onClose={() => setShowHistory(false)} />
      )}

      {/* Natal Chart overlay (Feature 2) */}
      {showChart && userProfile && (
        <NatalChartView
          natalChart={userProfile.natalChart}
          onClose={() => setShowChart(false)}
        />
      )}

      {/* Oracle reading overlay */}
      {appState === 'revealing' && oracleText && (
        <OracleReading
          oracleText={oracleText}
          verdict={oracleVerdict}
          category={oracleCategory}
          article={oracleArticle}
          dailyReport={dailyReport}
          questionText={submittedQuestion}
          onAskAgain={handleAskAgain}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}

export default App;
