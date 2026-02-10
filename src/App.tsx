import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BirthData, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { classifyQuestionWithConfidence, detectQuestionMode } from './lib/scoreDecision';
import { playClick, playReveal, setMuted } from './lib/sounds';
import { generateOracleResponse } from './lib/oracleResponse';
import { callLLMOracle, callFollowUpLLM, type LLMOracleResult } from './lib/llmOracle';
import { generateInsightArticle, generateFallbackArticle, getScoreLabel } from './lib/insightArticle';
import type { InsightArticle } from './lib/insightArticle';
import {
  generateFollowUpResponse,
  generateFollowUpQuestions,
  generateContextualFollowUpResponse,
  type FollowUpType,
  type FollowUpQuestion,
} from './lib/followUpResponse';

import { usePersonalCosmos } from './hooks/usePersonalCosmos';
import { getDailyWhisper } from './lib/cosmicWhisper';
import { saveReading, analyzePatterns } from './lib/readingHistory';

import { BirthDataForm } from './components/BirthDataForm';
import { getCity } from './lib/cities';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { CosmicDashboard } from './components/CosmicDashboard';
import { ReadingHistory } from './components/ReadingHistory';
import { NatalChartView } from './components/NatalChartView';
import { ProfileManager } from './components/ProfileManager';
import { BottomTabBar, type ActiveTab } from './components/BottomTabBar';
import { CompatibilityView } from './components/CompatibilityView';
import { SeerIntro } from './components/SeerIntro';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import { useI18n, LANGUAGE_LABELS, type Language } from './i18n/I18nContext';

import './App.css';

type AppState = 'idle' | 'summoning' | 'awaiting_question' | 'gazing' | 'revealing';
type SettingsView = 'hidden' | 'settings' | 'add' | 'edit';

function App() {
  const { lang, setLang, t } = useI18n();
  const [appState, setAppState] = useState<AppState>('idle');
  const [activeTab, setActiveTab] = useState<ActiveTab>('oracle');
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [oracleVerdict, setOracleVerdict] = useState<Verdict>('NEUTRAL');
  const [oracleCategory, setOracleCategory] = useState<QuestionCategory>('decisions');
  const [oracleArticle, setOracleArticle] = useState<InsightArticle | null>(null);
  const [, setOracleQuestionMode] = useState<'directional' | 'guidance'>('directional');

  // Follow-up state (inline, like Bonds)
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [followUpType, setFollowUpType] = useState<FollowUpType | null>(null);
  const [followUpRound, setFollowUpRound] = useState(0);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [contextualQuestions, setContextualQuestions] = useState<FollowUpQuestion[]>([]);
  const [showArticle, setShowArticle] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);
  const [shareToast, setShareToast] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('hidden');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

  // Onboarding state
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('seer_intro_seen'));
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const llmPromiseRef = useRef<Promise<LLMOracleResult> | null>(null);

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

  // Handle intro completion
  const handleIntroComplete = useCallback(() => {
    localStorage.setItem('seer_intro_seen', '1');
    setShowIntro(false);
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
      showHintOnce('seer_hint_summon', t('hint.oracle'));
    }
  }, [appState, hasBirthData, showHintOnce, t]);

  useEffect(() => {
    if (!hasBirthData) return;
    if (activeTab === 'cosmos') {
      showHintOnce('seer_hint_cosmos', t('hint.cosmos'));
    } else if (activeTab === 'chart') {
      showHintOnce('seer_hint_chart', t('hint.chart'));
    } else if (activeTab === 'bonds') {
      showHintOnce('seer_hint_bonds', t('hint.bonds'));
    }
  }, [activeTab, hasBirthData, showHintOnce, t]);

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
    return dailyReport.keyTransits.some(tr => tr.transit.isExact);
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

  // Submit question — classify silently, fire LLM call, go to gazing
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

    // Fire LLM call NOW — it runs during the gazing animation (~3s)
    // LLM reads the chart data directly and decides the answer itself
    if (userProfile && dailyReport) {
      const questionMode = detectQuestionMode(trimmed);
      llmPromiseRef.current = callLLMOracle(
        trimmed, questionMode, category, userProfile, dailyReport, lang
      );
    } else {
      llmPromiseRef.current = null;
    }

    setAppState('gazing');
  }, [questionText, userProfile, dailyReport, lang]);

  // Eye finished gazing - generate reading (async for LLM)
  const handleGazeComplete = useCallback(async () => {
    if (!astroContext) return;

    // LLM reads chart directly — verdict only used for template fallback
    const questionMode = detectQuestionMode(submittedQuestion);
    setOracleQuestionMode(questionMode);

    const classified = classifyQuestionWithConfidence(submittedQuestion);
    const category = selectedCategory ?? classified.category;
    const verdict: Verdict = 'NEUTRAL';

    // Try to get the LLM response (fired during gazing animation)
    let response: string;
    let usedLLM = false;

    if (llmPromiseRef.current) {
      try {
        const llmResult = await llmPromiseRef.current;
        if (llmResult.source === 'llm' && llmResult.text) {
          response = llmResult.text;
          usedLLM = true;
        } else {
          // LLM failed — fall back to templates
          const readingPatterns = analyzePatterns(userProfile?.id);
          response = generateOracleResponse(verdict, category, dailyReport, submittedQuestion, readingPatterns, questionMode);
        }
      } catch {
        const readingPatterns = analyzePatterns(userProfile?.id);
        response = generateOracleResponse(verdict, category, dailyReport, submittedQuestion, readingPatterns, questionMode);
      }
      llmPromiseRef.current = null;
    } else {
      // No LLM call (no profile/report) — use templates
      const readingPatterns = analyzePatterns(userProfile?.id);
      response = generateOracleResponse(verdict, category, dailyReport, submittedQuestion, readingPatterns, questionMode);
    }

    setAppState('revealing');
    setOracleText(response);
    setOracleVerdict(verdict);
    setOracleCategory(category);

    // Reset follow-up state for new reading
    setFollowUpText(null);
    setFollowUpType(null);
    setFollowUpRound(0);
    setFollowUpLoading(false);
    setShowFollowUps(false);
    setShowArticle(false);

    // Generate contextual follow-up questions
    const questions = generateFollowUpQuestions(verdict, category, dailyReport);
    setContextualQuestions(questions);

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

    if (usedLLM) {
      console.log('[Seer] LLM response used');
    }

    // Scroll answer into view after render
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
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
      setFollowUpText(null);
      setFollowUpType(null);
      setFollowUpRound(0);
      setFollowUpLoading(false);
      setShowFollowUps(false);
      setShowArticle(false);
      setContextualQuestions([]);
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
    setFollowUpText(null);
    setFollowUpType(null);
    setFollowUpRound(0);
    setFollowUpLoading(false);
    setShowFollowUps(false);
    setShowArticle(false);
    setContextualQuestions([]);
  }, []);

  // Ask again
  const handleAskAgain = useCallback(() => {
    playClick();
    setOracleText('');
    setOracleArticle(null);
    setSubmittedQuestion('');
    setQuestionText('');
    setSelectedCategory(null);
    setFollowUpText(null);
    setFollowUpType(null);
    setFollowUpRound(0);
    setFollowUpLoading(false);
    setShowFollowUps(false);
    setShowArticle(false);
    setContextualQuestions([]);
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

    // Fire LLM call NOW — same as handleSubmitQuestion
    if (userProfile && dailyReport) {
      const questionMode = detectQuestionMode(question);
      llmPromiseRef.current = callLLMOracle(
        question, questionMode, category, userProfile, dailyReport, lang
      );
    } else {
      llmPromiseRef.current = null;
    }

    setAppState('gazing');
  }, [userProfile, dailyReport, lang]);

  // Handle follow-up (static buttons) — async with LLM
  const handleFollowUp = useCallback(async (type: FollowUpType) => {
    const templateResponse = generateFollowUpResponse(type, oracleVerdict, oracleCategory, dailyReport);
    setFollowUpType(type);
    setFollowUpRound(prev => prev + 1);

    if (userProfile && dailyReport) {
      setFollowUpLoading(true);
      try {
        const followUpQ = type === 'when_change' ? 'When will this change?' : 'Tell me more';
        const llmResult = await callFollowUpLLM(
          followUpQ, submittedQuestion, oracleText, oracleCategory, userProfile, dailyReport, lang
        );
        if (llmResult.source === 'llm' && llmResult.text) {
          setFollowUpText(llmResult.text);
          setFollowUpLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Follow-up LLM failed, using template:', err);
      }
      setFollowUpLoading(false);
    }

    setFollowUpText(templateResponse);
  }, [oracleVerdict, oracleCategory, dailyReport, userProfile, submittedQuestion, oracleText, lang]);

  // Handle contextual follow-up question tap — async with LLM
  const handleContextualQuestion = useCallback(async (question: FollowUpQuestion) => {
    const templateResponse = generateContextualFollowUpResponse(
      question.text, oracleVerdict, oracleCategory, dailyReport
    );
    setFollowUpType('contextual');
    setFollowUpRound(prev => prev + 1);

    if (followUpRound < 1) {
      const nextQuestions = generateFollowUpQuestions(oracleVerdict, oracleCategory, dailyReport)
        .filter(q => q.text !== question.text);
      setContextualQuestions(nextQuestions.slice(0, 2));
    } else {
      setContextualQuestions([]);
    }

    if (userProfile && dailyReport) {
      setFollowUpLoading(true);
      try {
        const llmResult = await callFollowUpLLM(
          question.text, submittedQuestion, oracleText, oracleCategory, userProfile, dailyReport, lang
        );
        if (llmResult.source === 'llm' && llmResult.text) {
          setFollowUpText(llmResult.text);
          setFollowUpLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Contextual follow-up LLM failed, using template:', err);
      }
      setFollowUpLoading(false);
    }

    setFollowUpText(templateResponse);
  }, [oracleVerdict, oracleCategory, dailyReport, followUpRound, userProfile, submittedQuestion, oracleText, lang]);

  // Handle share — generate canvas image
  const handleShare = useCallback(async () => {
    const canvas = shareCanvasRef.current;
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

    ctx.fillStyle = '#C9A84C';
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
  }, [oracleText]);

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
      setFollowUpText(null);
      setFollowUpType(null);
      setFollowUpRound(0);
      setFollowUpLoading(false);
      setShowFollowUps(false);
      setShowArticle(false);
      setContextualQuestions([]);
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
          <button className="header-brand" onClick={handleBrandClick}>{t('header.brand')}</button>
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
      <main className={`app-main ${hasBirthData && (activeTab === 'cosmos' || activeTab === 'chart' || activeTab === 'bonds' || appState === 'revealing') ? 'app-main--scrollable' : ''}`}>
        {/* First visit - intro screens then birth form */}
        {!hasBirthData && !cosmosLoading && showIntro && (
          <SeerIntro onComplete={handleIntroComplete} />
        )}
        {!hasBirthData && !cosmosLoading && !showIntro && (
          <div className="onboarding">
            <div className="onboarding-title">
              <span className="title-the">{t('onboarding.the')}</span>
              <span className="title-seer">{t('onboarding.seer')}</span>
            </div>
            <div className="onboarding-form">
              <BirthDataForm onSubmit={handleBirthDataSubmit} />
            </div>
          </div>
        )}

        {/* Loading indicator while cosmos engine initializes */}
        {!hasBirthData && cosmosLoading && (
          <p className="cosmos-status">{t('onboarding.loading')}</p>
        )}

        {/* Cosmos error */}
        {hasBirthData && cosmosError && !cosmosLoading && (
          <p className="cosmos-status cosmos-status--warn">{t('onboarding.warnPrecision')}</p>
        )}

        {/* === ORACLE TAB === */}
        {hasBirthData && activeTab === 'oracle' && (
          <div className={`oracle-card${appState === 'summoning' || appState === 'gazing' ? ' oracle-card--processing' : ''}`}>

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
              <p className="seer-acknowledgment">{t('oracle.sleeping')}</p>
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
              <p className="current-question">{'\u201C'}{submittedQuestion}{'\u201D'}</p>
            )}

            {/* Summon button */}
            {appState === 'idle' && (
              <button className="summon-btn" onClick={handleSummon}>
                {t('oracle.summon')}
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

            {/* ── Inline Answer (like Bonds) — below eye ── */}
            {appState === 'revealing' && oracleText && !showArticle && (
              <div className="seer-answer-container" ref={answerRef}>
                {/* Oracle prose — the main reading */}
                <div className="seer-answer-text">
                  <span className="seer-answer-quote">{'\u201C'}</span>
                  {oracleText}
                  <span className="seer-answer-quote">{'\u201D'}</span>
                </div>

                {/* Follow-up response area */}
                {(followUpText || followUpLoading) && (
                  <div className="seer-follow-up-response">
                    <div className="seer-follow-up-label">
                      {followUpType === 'when_change' ? t('oracle.timing') : t('oracle.deeperInsight')}
                    </div>
                    {followUpLoading ? (
                      <p className="seer-follow-up-text seer-follow-up-text--loading">{t('oracle.deeper')}</p>
                    ) : (
                      <p className="seer-follow-up-text">{followUpText}</p>
                    )}
                  </div>
                )}

                {/* "Learn more" toggle */}
                {followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change') && !showFollowUps && (
                  <button
                    className="seer-learn-more"
                    onClick={() => setShowFollowUps(true)}
                  >
                    {t('oracle.learnMore')}
                  </button>
                )}

                {/* Follow-up questions (hidden until toggled) */}
                {followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change') && showFollowUps && (
                  <div className="seer-follow-ups">
                    {/* Article link */}
                    {oracleArticle && !followUpText && (
                      <button
                        className="seer-follow-up-question"
                        onClick={() => setShowArticle(true)}
                      >
                        <span className="seer-follow-up-question-icon">{'\u203A'}</span>
                        <span className="seer-follow-up-question-text">{t('oracle.whyOracle')}</span>
                      </button>
                    )}

                    {/* Contextual transit-aware questions */}
                    {contextualQuestions.map((q, i) => (
                      <button
                        key={i}
                        className="seer-follow-up-question"
                        onClick={() => handleContextualQuestion(q)}
                      >
                        <span className="seer-follow-up-question-icon">{'\u203A'}</span>
                        <span className="seer-follow-up-question-text">{q.text}</span>
                      </button>
                    ))}

                    {/* "When Will This Change?" */}
                    {followUpType !== 'when_change' && (
                      <button
                        className="seer-follow-up-question seer-follow-up-question--timing"
                        onClick={() => handleFollowUp('when_change')}
                      >
                        <span className="seer-follow-up-question-icon">{'\u29D7'}</span>
                        <span className="seer-follow-up-question-text">{t('oracle.whenChange')}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Follow-ups exhausted */}
                {!(followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change')) && followUpRound > 0 && (
                  <p className="seer-follow-up-exhausted">{t('oracle.exhausted')}</p>
                )}

                {/* Bottom actions: Ask Again + Share */}
                <div className="seer-answer-actions">
                  <button className="seer-ask-again-btn" onClick={handleAskAgain}>
                    {t('oracle.askAgain')}
                  </button>

                  <button
                    className="seer-share-icon"
                    onClick={handleShare}
                    aria-label="Share reading"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 10V2M8 2L5 5M8 2L11 5" />
                      <path d="M3 9V13H13V9" />
                    </svg>
                  </button>
                </div>

                {/* Share toast */}
                {shareToast && (
                  <div className="seer-share-toast">{t('oracle.copied')}</div>
                )}

                {/* Hidden canvas for share card */}
                <canvas ref={shareCanvasRef} style={{ display: 'none' }} />
              </div>
            )}

            {/* ── Article view (inline, replaces answer) ── */}
            {appState === 'revealing' && showArticle && oracleArticle && (
              <div className="seer-article-container" ref={answerRef}>
                <div className="seer-article-header">
                  <h2 className="seer-article-title" style={{ color: '#C9A84C' }}>{oracleArticle.title}</h2>
                  <div className="seer-article-score">
                    <span className="seer-article-score-value" style={{ color: '#C9A84C' }}>{oracleArticle.score}</span>
                    <span className="seer-article-score-max">/10</span>
                    <span className="seer-article-score-label">{getScoreLabel(oracleArticle.score)}</span>
                  </div>
                </div>
                <div className="seer-article-body">
                  {oracleArticle.sections.map((section, i) => (
                    <div key={i} className="seer-article-section">
                      <h3 className="seer-article-section-heading">{section.heading}</h3>
                      <p className="seer-article-section-body">{section.body}</p>
                    </div>
                  ))}
                </div>
                <div className="seer-answer-actions">
                  <button className="seer-ask-again-btn" onClick={() => setShowArticle(false)}>
                    {t('general.back')}
                  </button>
                  <button className="seer-ask-again-btn" onClick={handleDismiss}>
                    {t('general.dismiss')}
                  </button>
                </div>
              </div>
            )}

            {/* Contextual hint */}
            {activeHint && activeTab === 'oracle' && appState !== 'revealing' && (
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
                        ? t('ritual.newMoon')
                        : t('ritual.fullMoon')}
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

      {/* Bottom Tab Bar — always shown after onboarding */}
      {hasBirthData && (
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
              <h2>{settingsView === 'settings' ? t('settings.title') : settingsView === 'edit' ? t('settings.editProfile') : t('settings.newProfile')}</h2>
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
                  <span className="settings-row-label">{t('settings.sound')}</span>
                  <button
                    className={`settings-toggle ${!isMuted ? 'settings-toggle--on' : ''}`}
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>

                {/* Language switcher */}
                <div className="settings-row">
                  <span className="settings-row-label">{t('settings.language')}</span>
                  <div className="lang-switcher">
                    {(['en', 'ja', 'vi'] as Language[]).map(l => (
                      <button
                        key={l}
                        className={`lang-btn ${lang === l ? 'lang-btn--active' : ''}`}
                        onClick={() => { playClick(); setLang(l); }}
                      >
                        {LANGUAGE_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reading History link */}
                <button
                  className="settings-row settings-row--link"
                  onClick={() => { playClick(); setShowHistory(true); }}
                >
                  <span className="settings-row-label">{t('settings.history')}</span>
                  <span className="settings-row-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                </button>

                {/* Profiles section */}
                <div className="settings-section">
                  <h3 className="settings-section-label">{t('settings.profiles')}</h3>
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

      {/* (OracleReading is now rendered inline inside oracle-card) */}
    </div>
  );
}

export default App;
