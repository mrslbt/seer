import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BirthData, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { scoreDecision, classifyQuestionWithConfidence } from './lib/scoreDecision';
import { playClick, playVerdictSound, playReveal, setMuted } from './lib/sounds';
import { generateOracleResponse } from './lib/oracleResponse';
import { generateInsightArticle, generateFallbackArticle } from './lib/insightArticle';
import type { InsightArticle } from './lib/insightArticle';

import { usePersonalCosmos } from './hooks/usePersonalCosmos';
import { scorePersonalDecision } from './lib/personalScoreDecision';
import { getDailyWhisper } from './lib/cosmicWhisper';
import { saveReading, analyzePatterns } from './lib/readingHistory';

import { BirthDataForm } from './components/BirthDataForm';
import { getCity } from './lib/cities';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { OracleReading } from './components/OracleReading';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { CosmicDashboard } from './components/CosmicDashboard';
import { ReadingHistory } from './components/ReadingHistory';
import { NatalChartView } from './components/NatalChartView';
import { ProfileManager } from './components/ProfileManager';
import { BottomTabBar, type ActiveTab } from './components/BottomTabBar';
import { CompatibilityView } from './components/CompatibilityView';
import { SeerIntro } from './components/SeerIntro';
import { FirstGlimpse } from './components/FirstGlimpse';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';

import './App.css';

type AppState = 'idle' | 'summoning' | 'awaiting_question' | 'gazing' | 'revealing';
type SettingsView = 'hidden' | 'settings' | 'add' | 'edit';

function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [activeTab, setActiveTab] = useState<ActiveTab>('oracle');
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [oracleVerdict, setOracleVerdict] = useState<Verdict>('NEUTRAL');
  const [oracleCategory, setOracleCategory] = useState<QuestionCategory>('decisions');
  const [oracleArticle, setOracleArticle] = useState<InsightArticle | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('hidden');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Onboarding state
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('seer_intro_seen'));
  const [showFirstGlimpse, setShowFirstGlimpse] = useState(false);
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevHadBirthData = useRef(false);

  const {
    isLoading: cosmosLoading,
    error: cosmosError,
    dailyReport,
    setUserFromOldBirthData,
    updateProfile,
    refreshDailyReport,
    userProfile,
    allProfiles,
    switchProfile,
    deleteProfile
  } = usePersonalCosmos();

  // Derive hasBirthData and astroContext from userProfile
  const hasBirthData = userProfile !== null;

  const astroContext = useMemo(() => {
    if (!userProfile) return null;
    const oldBirthData: BirthData = {
      date: userProfile.birthData.birthDate,
      time: userProfile.birthData.birthTime,
      city: userProfile.birthData.birthLocation.city,
      country: userProfile.birthData.birthLocation.country,
      latitude: userProfile.birthData.birthLocation.latitude,
      longitude: userProfile.birthData.birthLocation.longitude,
      timezone: '',
    };
    return generateAstroContext(oldBirthData, new Date());
  }, [userProfile]);

  // Auto-refresh dashboard data every 30 minutes while Cosmos tab is active
  useDashboardRefresh(activeTab === 'cosmos', refreshDailyReport);

  // Trigger FirstGlimpse when user submits birth data for the first time
  useEffect(() => {
    if (hasBirthData && !prevHadBirthData.current && !localStorage.getItem('seer_first_glimpse_seen')) {
      setShowFirstGlimpse(true);
    }
    prevHadBirthData.current = hasBirthData;
  }, [hasBirthData]);

  // Handle intro completion
  const handleIntroComplete = useCallback(() => {
    localStorage.setItem('seer_intro_seen', '1');
    setShowIntro(false);
  }, []);

  // Handle first glimpse completion
  const handleFirstGlimpseEnter = useCallback(() => {
    localStorage.setItem('seer_first_glimpse_seen', '1');
    setShowFirstGlimpse(false);
  }, []);

  // Show contextual hint for first tab visits
  const showHintOnce = useCallback((key: string, text: string) => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    setActiveHint(text);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setActiveHint(null), 4000);
  }, []);

  // Trigger hints on tab/state changes
  useEffect(() => {
    if (!hasBirthData) return;
    if (appState === 'awaiting_question') {
      showHintOnce('seer_hint_summon', 'Speak your question. The Seer will answer.');
    }
  }, [appState, hasBirthData, showHintOnce]);

  useEffect(() => {
    if (!hasBirthData) return;
    if (activeTab === 'cosmos') {
      showHintOnce('seer_hint_cosmos', 'Your daily cosmic weather');
    } else if (activeTab === 'chart') {
      showHintOnce('seer_hint_chart', 'Your birth sky, mapped');
    } else if (activeTab === 'bonds') {
      showHintOnce('seer_hint_bonds', 'Compare your chart with another soul');
    }
  }, [activeTab, hasBirthData, showHintOnce]);

  // ---- Greeting (above the eye) ----
  const seerAcknowledgment = useMemo(() => {
    const name = userProfile?.birthData.name;
    if (!name) return null;
    return `I have your celestial map, ${name}. Now ask.`;
  }, [userProfile]);

  // ---- Cosmic Whisper (Feature 1) ----
  const cosmicWhisper = useMemo(() => {
    if (!dailyReport) return null;
    return getDailyWhisper(dailyReport, userProfile?.id);
  }, [dailyReport, userProfile?.id]);

  // ---- Daily Cosmic Mood (Feature 2) ----
  const cosmicMoodScore = dailyReport?.overallScore ?? 5;

  // ---- Cosmic Hint for idle screen ----
  const cosmicHint = useMemo(() => {
    if (!dailyReport) return null;
    const cats = dailyReport.categories;
    const entries = Object.entries(cats) as [string, { score: number }][];
    const best = entries.reduce((a, b) => b[1].score > a[1].score ? b : a);
    const worst = entries.reduce((a, b) => b[1].score < a[1].score ? b : a);
    const name = userProfile?.birthData.name;
    if (best[1].score >= 7) {
      const label = best[0].charAt(0).toUpperCase() + best[0].slice(1);
      return name
        ? `${name}, ${label.toLowerCase()} is strong today`
        : `${label} is strong today (${best[1].score}/10)`;
    }
    if (worst[1].score <= 3) {
      const label = worst[0].charAt(0).toUpperCase() + worst[0].slice(1);
      return name
        ? `${label} needs patience today, ${name}`
        : `${label} needs patience today (${worst[1].score}/10)`;
    }
    return null;
  }, [dailyReport, userProfile]);

  // ---- Transit Alerts (Feature 4) — dismiss after viewing cosmos tab ----
  const [cosmosSeenDate, setCosmosSeenDate] = useState<string | null>(
    () => localStorage.getItem('seer_cosmos_seen_date')
  );

  const hasTransitAlert = useMemo(() => {
    if (!dailyReport) return false;
    const today = new Date().toDateString();
    if (cosmosSeenDate === today) return false;
    return dailyReport.keyTransits.some(t => t.transit.isExact);
  }, [dailyReport, cosmosSeenDate]);

  // Mark cosmos as seen when tab is visited
  useEffect(() => {
    if (activeTab === 'cosmos' && hasTransitAlert) {
      const today = new Date().toDateString();
      localStorage.setItem('seer_cosmos_seen_date', today);
      setCosmosSeenDate(today);
    }
  }, [activeTab, hasTransitAlert]);

  // ---- Retrograde Countdown (Feature 7) ----
  const activeRetrogrades = dailyReport?.retrogrades ?? [];

  // ---- Moon Phase Ritual (Feature 8) ----
  const isSpecialMoonPhase = useMemo(() => {
    if (!dailyReport) return null;
    const name = dailyReport.moonPhase.name;
    if (name === 'New Moon' || name === 'Full Moon') return name;
    return null;
  }, [dailyReport]);

  // Handle birth data submission (from form — onboarding or add profile)
  const handleBirthDataSubmit = useCallback(async (data: BirthData, name: string) => {
    playClick();
    await setUserFromOldBirthData(data, name);
    setSettingsView('hidden');
  }, [setUserFromOldBirthData]);

  // Get the profile being edited (as old BirthData format for the form)
  const editingProfile = useMemo(() => {
    if (!editingProfileId) return null;
    const profile = allProfiles.find(p => p.id === editingProfileId);
    if (!profile) return null;
    const bd = profile.birthData;
    // Look up IANA timezone from cities database
    const cityData = getCity(bd.birthLocation.city, bd.birthLocation.country);
    const oldData: BirthData = {
      date: bd.birthDate,
      time: bd.birthTime,
      city: bd.birthLocation.city,
      country: bd.birthLocation.country,
      latitude: bd.birthLocation.latitude,
      longitude: bd.birthLocation.longitude,
      timezone: cityData?.timezone ?? '',
    };
    return { oldData, name: bd.name };
  }, [editingProfileId, allProfiles]);

  // Handle edit profile request
  const handleEditProfile = useCallback((profileId: string) => {
    setEditingProfileId(profileId);
    setSettingsView('edit');
  }, []);

  // Handle edit profile submission
  const handleEditProfileSubmit = useCallback(async (data: BirthData, name: string) => {
    if (!editingProfileId) return;
    playClick();
    await updateProfile(editingProfileId, data, name);
    setEditingProfileId(null);
    setSettingsView('settings');
  }, [editingProfileId, updateProfile]);

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

  // Submit question — classify silently and go straight to gazing
  const handleSubmitQuestion = useCallback(() => {
    const validation = validateQuestionInput(questionText);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Invalid question');
      return;
    }

    setQuestionError(null);
    playClick();

    const trimmed = questionText.trim();
    setSubmittedQuestion(trimmed);

    const { category } = classifyQuestionWithConfidence(trimmed);
    setSelectedCategory(category);

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

    const readingPatterns = analyzePatterns(userProfile?.id);
    const response = generateOracleResponse(verdict, category, dailyReport, submittedQuestion, readingPatterns);
    setOracleText(response);
    setOracleVerdict(verdict);
    setOracleCategory(category);

    if (dailyReport) {
      setOracleArticle(generateInsightArticle(category, dailyReport));
    } else if (astroContext) {
      setOracleArticle(generateFallbackArticle(category, verdict, astroContext));
    }

    saveReading({
      question: submittedQuestion,
      verdict,
      oracleText: response,
      category,
      moonPhase: dailyReport?.moonPhase.name,
      overallScore: dailyReport?.overallScore,
      profileId: userProfile?.id,
    });

    setTimeout(() => {
      playVerdictSound(verdict);
    }, 300);
  }, [astroContext, submittedQuestion, dailyReport, userProfile, selectedCategory]);

  // Header brand click — return to oracle tab
  const handleBrandClick = useCallback(() => {
    playClick();
    setActiveTab('oracle');
    if (appState !== 'idle') {
      setAppState('idle');
      setOracleText('');
      setOracleArticle(null);
      setSubmittedQuestion('');
      setQuestionText('');
      setSelectedCategory(null);
    }
  }, [appState]);

  // Dismiss reading
  const handleDismiss = useCallback(() => {
    setAppState('idle');
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setSelectedCategory(null);
  }, []);

  // Ask again
  const handleAskAgain = useCallback(() => {
    playClick();
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setSelectedCategory(null);
    setAppState('awaiting_question');
  }, []);

  // Select a suggested question
  const handleSuggestedSelect = useCallback((question: string) => {
    playClick();
    setQuestionText(question);
    setQuestionError(null);
    setSubmittedQuestion(question);
    const { category } = classifyQuestionWithConfidence(question);
    setSelectedCategory(category);
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

  // Tab change handler
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

  // Profile switch handler
  const handleProfileSwitch = useCallback((profileId: string) => {
    switchProfile(profileId);
    setActiveTab('oracle');
    // Reset app state if in the middle of something
    if (appState !== 'idle') {
      setAppState('idle');
      setOracleText('');
      setOracleArticle(null);
      setSubmittedQuestion('');
      setQuestionText('');
      setSelectedCategory(null);
    }
  }, [switchProfile, appState]);

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

  // Cosmic mood CSS class for eye glow
  const cosmicMoodClass = cosmicMoodScore >= 8 ? 'mood-excellent'
    : cosmicMoodScore >= 6 ? 'mood-good'
    : cosmicMoodScore >= 4 ? 'mood-mixed'
    : 'mood-challenging';

  return (
    <div className="app">
      {/* Header — brand left, settings right */}
      <header className="app-header">
        {hasBirthData ? (
          <button className="header-brand" onClick={handleBrandClick}>The Seer</button>
        ) : (
          <div />
        )}
        {hasBirthData && (
          <button
            className="header-settings-btn"
            onClick={() => { playClick(); setSettingsView('settings'); }}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        )}
      </header>

      {/* Main content */}
      <main className={`app-main ${hasBirthData && (activeTab === 'cosmos' || activeTab === 'chart' || activeTab === 'bonds') ? 'app-main--scrollable' : ''}`}>
        {/* First visit - intro screens then birth form */}
        {!hasBirthData && !cosmosLoading && showIntro && (
          <SeerIntro onComplete={handleIntroComplete} />
        )}
        {!hasBirthData && !cosmosLoading && !showIntro && (
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
        {!hasBirthData && cosmosLoading && (
          <p className="cosmos-status">Aligning the cosmos...</p>
        )}

        {/* Cosmos error */}
        {hasBirthData && cosmosError && !cosmosLoading && (
          <p className="cosmos-status cosmos-status--warn">Readings may be less precise today</p>
        )}

        {/* === ORACLE TAB === */}
        {hasBirthData && activeTab === 'oracle' && (
          <div className={`oracle-card${appState === 'summoning' || appState === 'gazing' || appState === 'revealing' ? ' oracle-card--processing' : ''}`}>

            {/* Profile indicator — shown when multiple profiles exist */}
            {appState === 'idle' && allProfiles.length > 1 && userProfile && (
              <button
                className="profile-indicator"
                onClick={() => { playClick(); setSettingsView('settings'); }}
              >
                {userProfile.birthData.name}
              </button>
            )}

            {/* Cryptic acknowledgment — the Seer notes your presence */}
            {appState === 'idle' && (
              <p className="seer-acknowledgment">I sleep until summoned.</p>
            )}
            {appState === 'awaiting_question' && seerAcknowledgment && (
              <p className="seer-acknowledgment">{seerAcknowledgment}</p>
            )}

            {/* The Eye — with cosmic mood class */}
            <div className={`eye-section ${cosmicMoodClass}`}>
              <SeerEye
                state={getEyeState()}
                onOpenComplete={handleEyeOpenComplete}
                onGazeComplete={handleGazeComplete}
              />
            </div>

            {/* Submitted question while gazing */}
            {appState === 'gazing' && (
              <p className="current-question">"{submittedQuestion}"</p>
            )}

            {/* Summon button */}
            {appState === 'idle' && (
              <button className="summon-btn" onClick={handleSummon}>
                Summon
              </button>
            )}

            {/* Question input */}
            {appState === 'awaiting_question' && (
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

            {/* Contextual hint */}
            {activeHint && activeTab === 'oracle' && (
              <p className="contextual-hint">{activeHint}</p>
            )}

            {/* Cosmic footer — ambient data below the eye */}
            {appState === 'idle' && !cosmosLoading && (
              <div className="oracle-card__footer">
                {/* Cosmic Whisper */}
                {cosmicWhisper && (
                  <p className="cosmic-whisper">{cosmicWhisper}</p>
                )}

                {/* Cosmic Hint — top category energy */}
                {cosmicHint && !cosmicWhisper && (
                  <p className="cosmic-hint">{cosmicHint}</p>
                )}

                {/* Retrograde Alert */}
                {activeRetrogrades.length > 0 && (
                  <div className="retrograde-alert">
                    {activeRetrogrades.map(r => (
                      <span key={r.planet} className="retrograde-badge">
                        {r.planet.charAt(0).toUpperCase() + r.planet.slice(1)} Rx
                      </span>
                    ))}
                  </div>
                )}

                {/* Moon Phase Ritual */}
                {isSpecialMoonPhase && (
                  <div className="moon-ritual-hint">
                    <span className="moon-ritual-icon">{isSpecialMoonPhase === 'New Moon' ? '\u{1F311}' : '\u{1F315}'}</span>
                    <span className="moon-ritual-text">
                      {isSpecialMoonPhase === 'New Moon'
                        ? 'New Moon — Set intentions. Ask what to begin.'
                        : 'Full Moon — Seek clarity. Ask what to release.'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === COSMOS TAB === */}
        {hasBirthData && activeTab === 'cosmos' && activeHint && (
          <p className="contextual-hint">{activeHint}</p>
        )}
        {hasBirthData && activeTab === 'cosmos' && dailyReport && (
          <CosmicDashboard
            report={dailyReport}
            onRefresh={refreshDailyReport}
            mode="inline"
          />
        )}
        {hasBirthData && activeTab === 'cosmos' && !dailyReport && (
          <p className="cosmos-status">Loading cosmic data...</p>
        )}

        {/* === CHART TAB === */}
        {hasBirthData && activeTab === 'chart' && activeHint && (
          <p className="contextual-hint">{activeHint}</p>
        )}
        {hasBirthData && activeTab === 'chart' && userProfile && (
          <NatalChartView
            natalChart={userProfile.natalChart}
            mode="inline"
          />
        )}

        {/* === BONDS TAB === */}
        {hasBirthData && activeTab === 'bonds' && activeHint && (
          <p className="contextual-hint">{activeHint}</p>
        )}
        {hasBirthData && activeTab === 'bonds' && userProfile && (
          <CompatibilityView
            activeProfile={userProfile}
            allProfiles={allProfiles}
            onAddProfile={() => setSettingsView('add')}
          />
        )}
      </main>

      {/* Bottom Tab Bar — only shown after onboarding, hidden during reveal */}
      {hasBirthData && appState !== 'revealing' && (
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasTransitAlert={hasTransitAlert}
        />
      )}

      {/* Settings modal — consolidated */}
      {settingsView !== 'hidden' && (
        <div className="modal-overlay" onClick={() => { setSettingsView('hidden'); setEditingProfileId(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{settingsView === 'settings' ? 'Settings' : settingsView === 'edit' ? 'Edit Profile' : 'New Profile'}</h2>
              <button className="close-btn" onClick={() => { setSettingsView('hidden'); setEditingProfileId(null); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {settingsView === 'settings' && (
              <div className="settings-content">
                {/* Sound toggle */}
                <div className="settings-row">
                  <span className="settings-row-label">Sound</span>
                  <button
                    className={`settings-toggle ${!isMuted ? 'settings-toggle--on' : ''}`}
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>

                {/* Reading History link */}
                <button
                  className="settings-row settings-row--link"
                  onClick={() => { playClick(); setShowHistory(true); }}
                >
                  <span className="settings-row-label">Reading History</span>
                  <span className="settings-row-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                </button>

                {/* Profiles section */}
                <div className="settings-section">
                  <h3 className="settings-section-label">Profiles</h3>
                  <ProfileManager
                    profiles={allProfiles}
                    activeProfileId={userProfile?.id ?? null}
                    onSwitch={handleProfileSwitch}
                    onAddNew={() => setSettingsView('add')}
                    onDelete={deleteProfile}
                    onEdit={handleEditProfile}
                    onClose={() => setSettingsView('hidden')}
                  />
                </div>
              </div>
            )}

            {settingsView === 'add' && (
              <BirthDataForm onSubmit={handleBirthDataSubmit} />
            )}

            {settingsView === 'edit' && editingProfile && (
              <BirthDataForm
                onSubmit={handleEditProfileSubmit}
                initialData={editingProfile.oldData}
                initialName={editingProfile.name}
              />
            )}
          </div>
        </div>
      )}

      {/* Reading History overlay */}
      {showHistory && (
        <ReadingHistory onClose={() => setShowHistory(false)} profileId={userProfile?.id} />
      )}

      {/* First Glimpse overlay — personality reveal after first profile */}
      {showFirstGlimpse && userProfile && (
        <FirstGlimpse
          sunSign={userProfile.natalChart.sun.sign}
          moonSign={userProfile.natalChart.moon.sign}
          risingSign={userProfile.natalChart.ascendant?.sign}
          onEnter={handleFirstGlimpseEnter}
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
