import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { BirthData, Verdict, QuestionCategory } from './types/astrology';
import { generateAstroContext } from './lib/astroEngine';
import { classifyQuestionWithConfidence, detectQuestionMode } from './lib/scoreDecision';
import { playClick, playReveal, setMuted } from './lib/sounds';
import { detectCrisis, CRISIS_RESPONSE } from './lib/crisisDetection';
import { generateOracleResponse } from './lib/oracleResponse';
import { callLLMOracle, callFollowUpLLM, callChartQuestionLLM, callBondLLM, callCosmosQuestionLLM, type LLMOracleResult } from './lib/llmOracle';
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
import { saveReading, analyzePatterns, getTodayReadingCount } from './lib/readingHistory';
import { trackQuestionAsked, trackTabSwitched, trackReadingShared, trackProfileCreated, trackPartnerSelected, trackVisionLimitHit, identifyUser } from './lib/analytics';

import { BirthDataForm } from './components/BirthDataForm';
import { getCity } from './lib/cities';
import { QuestionInput, validateQuestionInput } from './components/QuestionInput';
import { SeerEye } from './components/SeerEye';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { CosmicDashboard } from './components/CosmicDashboard';
import { ReadingHistory } from './components/ReadingHistory';
import { NatalChartView } from './components/NatalChartView';
import { ProfileManager } from './components/ProfileManager';
import { InlineTabs, type ActiveTab } from './components/InlineTabs';
import { CompatibilityView } from './components/CompatibilityView';
import { SeerIntro } from './components/SeerIntro';
import { useDashboardRefresh } from './hooks/useDashboardRefresh';
import { useI18n, LANGUAGE_LABELS, type Language } from './i18n/I18nContext';
import type { TranslationKey } from './i18n/en';
import type { UserProfile } from './types/userProfile';
import type { SynastryReport } from './lib/synastry';

import './App.css';

type SeerPhase = 'open' | 'gazing' | 'revealing';
type SettingsView = 'hidden' | 'settings' | 'add' | 'edit';

// ── Timing question detection (shared with chart) ──
const TIMING_PATTERNS = [
  /\bwhen\b/i, /\bright now\b/i, /\btoday\b/i, /\bthis week\b/i,
  /\bthis month\b/i, /\bthis year\b/i, /\bcurrently\b/i, /\bsoon\b/i,
  /\btiming\b/i, /\bready\b/i, /\bseason\b/i, /\bperiod\b/i,
  /\bphase\b/i, /\bmoment\b/i, /\bnow\b/i,
];

function isTimingQuestion(question: string): boolean {
  return TIMING_PATTERNS.some(p => p.test(question.toLowerCase().trim()));
}

// ── Suggested question keys per tab ──
const CHART_QUESTION_KEYS: TranslationKey[] = [
  'chartQ.superpower', 'chartQ.loveStyle', 'chartQ.career', 'chartQ.purpose',
  'chartQ.blind', 'chartQ.gift', 'chartQ.shadow', 'chartQ.attract',
  'chartQ.lesson', 'chartQ.fear', 'chartQ.charm', 'chartQ.compatible',
];

const COSMOS_QUESTION_KEYS: TranslationKey[] = [
  'cosmosQ.focusToday', 'cosmosQ.feelOff', 'cosmosQ.loveToday',
  'cosmosQ.avoidToday', 'cosmosQ.bestFor', 'cosmosQ.energy',
];

const BOND_QUESTION_KEYS: TranslationKey[] = [
  'bondQ.together', 'bondQ.places', 'bondQ.fight', 'bondQ.challenge',
  'bondQ.dates', 'bondQ.unique', 'bondQ.balance',
  'bondQ.compatible', 'bondQ.chemistry', 'bondQ.last',
  'bondQ.trust', 'bondQ.timing', 'bondQ.serious',
];

function getRandomKeys(keys: TranslationKey[], count: number): TranslationKey[] {
  const shuffled = [...keys].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function App() {
  const { lang, setLang, t } = useI18n();

  // ── Core state ──
  const [seerPhase, setSeerPhase] = useState<SeerPhase>('open');
  const [activeTab, setActiveTab] = useState<ActiveTab>('oracle');
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [oracleText, setOracleText] = useState('');
  const [oracleVerdict, setOracleVerdict] = useState<Verdict>('NEUTRAL');
  const [oracleCategory, setOracleCategory] = useState<QuestionCategory>('decisions');
  const [oracleArticle, setOracleArticle] = useState<InsightArticle | null>(null);
  const [, setOracleQuestionMode] = useState<'directional' | 'guidance'>('directional');
  const [crisisDetected, setCrisisDetected] = useState(false);

  // Follow-up state (oracle tab only)
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

  // Bond partner state (lifted from CompatibilityView)
  const [bondPartner, setBondPartner] = useState<UserProfile | null>(null);
  const [bondSynastry, setBondSynastry] = useState<SynastryReport | null>(null);

  // Vision limit tracking (soft paywall — visual hints only, no blocking)
  const [todayVisionCount, setTodayVisionCount] = useState(0);
  const [showVisionHint, setShowVisionHint] = useState(false);

  // Tab-specific suggested question keys
  const [chartSuggestionKeys] = useState(() => getRandomKeys(CHART_QUESTION_KEYS, 4));
  const [cosmosSuggestionKeys] = useState(() => getRandomKeys(COSMOS_QUESTION_KEYS, 4));
  const [bondSuggestionKeys] = useState(() => getRandomKeys(BOND_QUESTION_KEYS, 4));

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

  useDashboardRefresh(activeTab === 'cosmos', refreshDailyReport);

  // ── Sync vision count from localStorage on mount / profile change ──
  useEffect(() => {
    setTodayVisionCount(getTodayReadingCount(userProfile?.id));
    if (userProfile?.id) identifyUser(userProfile.id);
  }, [userProfile?.id]);

  // ── Modal focus trap + Escape key ──
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (settingsView === 'hidden') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSettingsView('hidden');
        setEditingProfileId(null);
      }
    };

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Focus the first focusable element in the modal
    requestAnimationFrame(() => {
      const focusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [settingsView]);

  // ── Intro ──
  const handleIntroComplete = useCallback(() => {
    localStorage.setItem('seer_intro_seen', '1');
    setShowIntro(false);
  }, []);

  // ── Contextual hints ──
  const showHintOnce = useCallback((key: string, text: string) => {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    setActiveHint(text);
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = setTimeout(() => setActiveHint(null), 4000);
  }, []);

  useEffect(() => {
    if (!hasBirthData) return;
    if (activeTab === 'oracle') {
      showHintOnce('seer_hint_summon', t('hint.oracle'));
    } else if (activeTab === 'cosmos') {
      showHintOnce('seer_hint_cosmos', t('hint.cosmos'));
    } else if (activeTab === 'chart') {
      showHintOnce('seer_hint_chart', t('hint.chart'));
    } else if (activeTab === 'bonds') {
      showHintOnce('seer_hint_bonds', t('hint.bonds'));
    }
  }, [activeTab, hasBirthData, showHintOnce, t]);

  // ── Cosmic data ──
  const cosmicWhisper = useMemo(() => {
    if (!dailyReport) return null;
    return getDailyWhisper(dailyReport, userProfile?.id);
  }, [dailyReport, userProfile?.id]);

  const cosmicMoodScore = dailyReport?.overallScore ?? 5;

  const cosmicHint = useMemo(() => {
    if (!dailyReport) return null;
    const cats = dailyReport.categories;
    const entries = Object.entries(cats) as [string, { score: number }][];
    const best = entries.reduce((a, b) => b[1].score > a[1].score ? b : a);
    const worst = entries.reduce((a, b) => b[1].score < a[1].score ? b : a);
    const name = userProfile?.birthData.name;
    if (best[1].score >= 7) {
      const label = best[0].charAt(0).toUpperCase() + best[0].slice(1);
      return name ? `${name}, ${label.toLowerCase()} is strong today` : `${label} is strong today (${best[1].score}/10)`;
    }
    if (worst[1].score <= 3) {
      const label = worst[0].charAt(0).toUpperCase() + worst[0].slice(1);
      return name ? `${label} needs patience today, ${name}` : `${label} needs patience today (${worst[1].score}/10)`;
    }
    return null;
  }, [dailyReport, userProfile]);

  // ── Transit alerts ──
  const [cosmosSeenDate, setCosmosSeenDate] = useState<string | null>(
    () => localStorage.getItem('seer_cosmos_seen_date')
  );

  const hasTransitAlert = useMemo(() => {
    if (!dailyReport) return false;
    const today = new Date().toDateString();
    if (cosmosSeenDate === today) return false;
    return dailyReport.keyTransits.some(tr => tr.transit.isExact);
  }, [dailyReport, cosmosSeenDate]);

  useEffect(() => {
    if (activeTab === 'cosmos' && hasTransitAlert) {
      const today = new Date().toDateString();
      localStorage.setItem('seer_cosmos_seen_date', today);
      setCosmosSeenDate(today);
    }
  }, [activeTab, hasTransitAlert]);

  const activeRetrogrades = dailyReport?.retrogrades ?? [];

  const isSpecialMoonPhase = useMemo(() => {
    if (!dailyReport) return null;
    const name = dailyReport.moonPhase.name;
    if (name === 'New Moon' || name === 'Full Moon') return name;
    return null;
  }, [dailyReport]);

  // ── Birth data ──
  const handleBirthDataSubmit = useCallback(async (data: BirthData, name: string, emailData?: { email: string; consent: boolean }) => {
    playClick();
    await setUserFromOldBirthData(data, name);
    trackProfileCreated();
    setSettingsView('hidden');

    // Fire-and-forget email collection — never blocks onboarding
    if (emailData?.email) {
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailData.email,
          name: name.trim() || 'Cosmic Traveler',
          birthDate: data.date.toISOString().split('T')[0],
          birthCity: data.city,
          birthCountry: data.country,
          emailConsent: emailData.consent ? 1 : 0,
          language: document.documentElement.lang || 'en',
        }),
      }).catch(() => {});
    }
  }, [setUserFromOldBirthData]);

  const editingProfile = useMemo(() => {
    if (!editingProfileId) return null;
    const profile = allProfiles.find(p => p.id === editingProfileId);
    if (!profile) return null;
    const bd = profile.birthData;
    const cityData = getCity(bd.birthLocation.city, bd.birthLocation.country);
    const oldData: BirthData = {
      date: bd.birthDate, time: bd.birthTime,
      city: bd.birthLocation.city, country: bd.birthLocation.country,
      latitude: bd.birthLocation.latitude, longitude: bd.birthLocation.longitude,
      timezone: cityData?.timezone ?? '',
    };
    return { oldData, name: bd.name };
  }, [editingProfileId, allProfiles]);

  const handleEditProfile = useCallback((profileId: string) => {
    setEditingProfileId(profileId);
    setSettingsView('edit');
  }, []);

  const handleEditProfileSubmit = useCallback(async (data: BirthData, name: string) => {
    if (!editingProfileId) return;
    playClick();
    await updateProfile(editingProfileId, data, name);
    setEditingProfileId(null);
    setSettingsView('settings');
  }, [editingProfileId, updateProfile]);

  // ══════════════════════════════════════════
  // UNIFIED QUESTION FLOW
  // ══════════════════════════════════════════

  // Reset question state (shared across all tabs)
  const resetQuestionState = useCallback(() => {
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
    setQuestionError(null);
    setCrisisDetected(false);
    setSeerPhase('open');
    llmPromiseRef.current = null;
  }, []);

  // Submit question — routes to the correct LLM based on active tab
  const handleSubmitQuestion = useCallback(() => {
    const validation = validateQuestionInput(questionText);
    if (!validation.valid) {
      setQuestionError(validation.error || 'Invalid question');
      return;
    }

    setQuestionError(null);
    playClick();
    trackQuestionAsked(activeTab, detectQuestionMode(questionText.trim()));

    const trimmed = questionText.trim();
    setSubmittedQuestion(trimmed);

    // Crisis detection — show help resources instead of a reading
    if (detectCrisis(trimmed)) {
      setCrisisDetected(true);
      setOracleText(CRISIS_RESPONSE);
      setSeerPhase('revealing');
      return;
    }

    // Route LLM call based on active tab
    if (activeTab === 'oracle') {
      const { category } = classifyQuestionWithConfidence(trimmed);
      setSelectedCategory(category);
      if (userProfile && dailyReport) {
        const questionMode = detectQuestionMode(trimmed);
        llmPromiseRef.current = callLLMOracle(trimmed, questionMode, category, userProfile, dailyReport, lang);
      }
    } else if (activeTab === 'cosmos') {
      if (userProfile && dailyReport) {
        const questionMode = detectQuestionMode(trimmed);
        llmPromiseRef.current = callCosmosQuestionLLM(trimmed, questionMode, userProfile, dailyReport, lang);
      }
    } else if (activeTab === 'chart') {
      if (userProfile) {
        const questionMode = detectQuestionMode(trimmed);
        const isTiming = isTimingQuestion(trimmed);
        llmPromiseRef.current = callChartQuestionLLM(trimmed, questionMode, userProfile, dailyReport, isTiming, lang);
      }
    } else if (activeTab === 'bonds') {
      if (userProfile && bondPartner && bondSynastry) {
        const questionMode = detectQuestionMode(trimmed);
        llmPromiseRef.current = callBondLLM(trimmed, questionMode, userProfile, bondPartner, bondSynastry, null, lang);
      }
    }

    setSeerPhase('gazing');
  }, [questionText, activeTab, userProfile, dailyReport, bondPartner, bondSynastry, lang]);

  // Gaze complete — resolve the LLM answer
  const handleGazeComplete = useCallback(async () => {
    if (!astroContext && activeTab === 'oracle') return;
    playReveal();

    const questionMode = detectQuestionMode(submittedQuestion);
    setOracleQuestionMode(questionMode);

    let response = '';
    let usedLLM = false;

    if (llmPromiseRef.current) {
      try {
        const llmResult = await llmPromiseRef.current;
        if (llmResult.source === 'llm' && llmResult.text) {
          response = llmResult.text;
          usedLLM = true;
        }
      } catch {
        // fallback below
      }
      llmPromiseRef.current = null;
    }

    // Template fallback only for oracle tab
    if (!response && activeTab === 'oracle') {
      const classified = classifyQuestionWithConfidence(submittedQuestion);
      const category = selectedCategory ?? classified.category;
      const readingPatterns = analyzePatterns(userProfile?.id);
      response = generateOracleResponse('NEUTRAL' as Verdict, category, dailyReport, submittedQuestion, readingPatterns, questionMode);
    } else if (!response) {
      response = 'The stars are silent on this. Ask again, or ask differently.';
    }

    setSeerPhase('revealing');
    setOracleText(response);

    // Oracle-specific: follow-ups, article, history
    if (activeTab === 'oracle') {
      const classified = classifyQuestionWithConfidence(submittedQuestion);
      const category = selectedCategory ?? classified.category;
      setOracleVerdict('NEUTRAL');
      setOracleCategory(category);

      setFollowUpText(null);
      setFollowUpType(null);
      setFollowUpRound(0);
      setFollowUpLoading(false);
      setShowFollowUps(false);
      setShowArticle(false);

      const questions = generateFollowUpQuestions('NEUTRAL' as Verdict, category, dailyReport);
      setContextualQuestions(questions);

      if (dailyReport) {
        setOracleArticle(generateInsightArticle(category, dailyReport));
      } else if (astroContext) {
        setOracleArticle(generateFallbackArticle(category, 'NEUTRAL' as Verdict, astroContext));
      }

      saveReading({
        question: submittedQuestion, verdict: 'NEUTRAL', oracleText: response,
        category, moonPhase: dailyReport?.moonPhase.name,
        overallScore: dailyReport?.overallScore, profileId: userProfile?.id,
      });
    } else {
      // Save reading for non-oracle tabs too (bonds, chart, cosmos)
      const category = activeTab === 'bonds' ? 'love' as QuestionCategory
        : activeTab === 'cosmos' ? 'decisions' as QuestionCategory
        : 'self' as QuestionCategory;
      saveReading({
        question: submittedQuestion, verdict: 'NEUTRAL', oracleText: response,
        category, moonPhase: dailyReport?.moonPhase.name,
        overallScore: dailyReport?.overallScore, profileId: userProfile?.id,
      });
    }

    // Update vision count + show hint if threshold reached
    const newCount = getTodayReadingCount(userProfile?.id);
    setTodayVisionCount(newCount);
    if (newCount >= 2) {
      setShowVisionHint(true);
      setTimeout(() => setShowVisionHint(false), 8000);
    }
    if (newCount === 3) trackVisionLimitHit(newCount);

    if (usedLLM) console.log('[Seer] LLM response used');

    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }, [astroContext, submittedQuestion, dailyReport, userProfile, selectedCategory, activeTab]);

  // Select suggested question — fires immediately
  const handleSuggestedSelect = useCallback((question: string) => {
    playClick();
    setQuestionText(question);
    setQuestionError(null);
    setSubmittedQuestion(question);

    // Crisis detection — show help resources instead of a reading
    if (detectCrisis(question)) {
      setCrisisDetected(true);
      setOracleText(CRISIS_RESPONSE);
      setSeerPhase('revealing');
      return;
    }

    // Route LLM call based on active tab
    if (activeTab === 'oracle') {
      const { category } = classifyQuestionWithConfidence(question);
      setSelectedCategory(category);
      if (userProfile && dailyReport) {
        const questionMode = detectQuestionMode(question);
        llmPromiseRef.current = callLLMOracle(question, questionMode, category, userProfile, dailyReport, lang);
      }
    } else if (activeTab === 'cosmos') {
      if (userProfile && dailyReport) {
        const questionMode = detectQuestionMode(question);
        llmPromiseRef.current = callCosmosQuestionLLM(question, questionMode, userProfile, dailyReport, lang);
      }
    } else if (activeTab === 'chart') {
      if (userProfile) {
        const questionMode = detectQuestionMode(question);
        const isTiming = isTimingQuestion(question);
        llmPromiseRef.current = callChartQuestionLLM(question, questionMode, userProfile, dailyReport, isTiming, lang);
      }
    } else if (activeTab === 'bonds') {
      if (userProfile && bondPartner && bondSynastry) {
        const questionMode = detectQuestionMode(question);
        llmPromiseRef.current = callBondLLM(question, questionMode, userProfile, bondPartner, bondSynastry, null, lang);
      }
    }

    setSeerPhase('gazing');
  }, [activeTab, userProfile, dailyReport, bondPartner, bondSynastry, lang]);

  // Ask again
  const handleAskAgain = useCallback(() => {
    playClick();
    resetQuestionState();
  }, [resetQuestionState]);

  // Header brand click
  const handleBrandClick = useCallback(() => {
    playClick();
    setActiveTab('oracle');
    resetQuestionState();
  }, [resetQuestionState]);

  // Tab change handler — reset question state
  const handleTabChange = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    trackTabSwitched(activeTab, tab);
    resetQuestionState();
    setActiveTab(tab);
  }, [activeTab, resetQuestionState]);

  // ── Oracle follow-ups ──
  const handleFollowUp = useCallback(async (type: FollowUpType) => {
    const templateResponse = generateFollowUpResponse(type, oracleVerdict, oracleCategory, dailyReport);
    setFollowUpType(type);
    setFollowUpRound(prev => prev + 1);

    if (userProfile && dailyReport) {
      setFollowUpLoading(true);
      try {
        const followUpQ = type === 'when_change' ? 'When will this change?' : 'Tell me more';
        const llmResult = await callFollowUpLLM(followUpQ, submittedQuestion, oracleText, oracleCategory, userProfile, dailyReport, lang);
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

  const handleContextualQuestion = useCallback(async (question: FollowUpQuestion) => {
    const templateResponse = generateContextualFollowUpResponse(question.text, oracleVerdict, oracleCategory, dailyReport);
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
        const llmResult = await callFollowUpLLM(question.text, submittedQuestion, oracleText, oracleCategory, userProfile, dailyReport, lang);
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

  // ── Share ──
  const handleShare = useCallback(async () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = 600; const h = 400;
    canvas.width = w; canvas.height = h;
    ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h / 2 - 20, 0, w / 2, h / 2, 250);
    grad.addColorStop(0, 'rgba(201, 168, 76, 0.06)'); grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
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
      if (ctx.measureText(test).width > w - 100) { lines.push(currentLine); currentLine = word + ' '; }
      else { currentLine = test; }
    }
    currentLine = currentLine.trim() + '\u201D';
    lines.push(currentLine);
    const lineHeight = 34;
    const startY = h / 2 - (lines.length * lineHeight) / 2 + 20;
    for (let i = 0; i < lines.length; i++) { ctx.fillText(lines[i], w / 2, startY + i * lineHeight); }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.font = '9px Inter, system-ui, sans-serif';
    ctx.fillText('theseer.xyz', w / 2, h - 24);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob && navigator.share) {
        const file = new File([blob], 'seer-reading.png', { type: 'image/png' });
        await navigator.share({ files: [file] });
        trackReadingShared();
      } else if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2000);
        trackReadingShared();
      }
    } catch { /* User cancelled */ }
  }, [oracleText]);

  // ── Misc handlers ──
  const handleQuestionChange = useCallback((value: string) => {
    setQuestionText(value);
    if (questionError) setQuestionError(null);
  }, [questionError]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMuted(newMuted);
    if (!newMuted) playClick();
  }, [isMuted]);

  const handleProfileSwitch = useCallback((profileId: string) => {
    switchProfile(profileId);
    setActiveTab('oracle');
    resetQuestionState();
    setBondPartner(null);
    setBondSynastry(null);
  }, [switchProfile, resetQuestionState]);

  // ── Bond partner callbacks (from CompatibilityView) ──
  const handlePartnerSelect = useCallback((partner: UserProfile, synastryReport: SynastryReport) => {
    setBondPartner(partner);
    setBondSynastry(synastryReport);
    trackPartnerSelected();
  }, []);

  const handlePartnerDeselect = useCallback(() => {
    setBondPartner(null);
    setBondSynastry(null);
    resetQuestionState();
  }, [resetQuestionState]);

  // ── Eye state: always open, gazing, or revealing ──
  const getEyeState = (): 'closed' | 'opening' | 'open' | 'gazing' | 'revealing' => {
    switch (seerPhase) {
      case 'open': return 'open';
      case 'gazing': return 'gazing';
      case 'revealing': return 'revealing';
      default: return 'open';
    }
  };

  // Cosmic mood CSS class
  const cosmicMoodClass = cosmicMoodScore >= 8 ? 'mood-excellent'
    : cosmicMoodScore >= 6 ? 'mood-good'
    : cosmicMoodScore >= 4 ? 'mood-mixed'
    : 'mood-challenging';

  // ── Placeholder by tab ──
  const getPlaceholder = (): string | undefined => {
    switch (activeTab) {
      case 'cosmos': return t('cosmosQ.placeholder');
      case 'chart': return t('chartQ.placeholder');
      case 'bonds': return bondPartner ? t('bonds.placeholder') : undefined;
      default: return undefined; // oracle uses rotating placeholders
    }
  };

  // ── Whether question input should be visible ──
  const isQuestionReady = activeTab !== 'bonds' || bondPartner !== null;

  // ── Render suggested questions based on active tab ──
  const renderSuggestedQuestions = () => {
    if (activeTab === 'oracle') {
      return <SuggestedQuestions onSelect={handleSuggestedSelect} />;
    }

    let keys: TranslationKey[] = [];
    let dividerKey: TranslationKey = 'suggested.divider';

    if (activeTab === 'cosmos') {
      keys = cosmosSuggestionKeys;
      dividerKey = 'cosmosQ.orAsk';
    } else if (activeTab === 'chart') {
      keys = chartSuggestionKeys;
      dividerKey = 'chartQ.orAsk';
    } else if (activeTab === 'bonds' && bondPartner) {
      keys = bondSuggestionKeys;
      dividerKey = 'bonds.orAsk';
    }

    if (keys.length === 0) return null;

    return (
      <div className="tab-suggestions">
        <p className="tab-suggestions-divider">{t(dividerKey)}</p>
        <div className="tab-suggestions-pills">
          {keys.map(key => (
            <button
              key={key}
              className="tab-suggestion-pill"
              onClick={() => handleSuggestedSelect(t(key))}
            >
              {t(key)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* Header */}
      <header className="app-header">
        {hasBirthData ? (
          <button className="header-brand" onClick={handleBrandClick} aria-label="The Seer — return to main view">
            <span className="header-brand-the">THE</span>
            <span className="header-brand-seer">Seer</span>
          </button>
        ) : (
          <div />
        )}
        {hasBirthData && (
          <button
            className="header-settings-btn"
            onClick={() => { playClick(); setSettingsView('settings'); }}
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="app-main app-main--scrollable" id="main-content">
        {hasBirthData && <h1 className="sr-only">The Seer — Oracle</h1>}
        {/* ── Onboarding ── */}
        {!hasBirthData && !cosmosLoading && showIntro && (
          <SeerIntro onComplete={handleIntroComplete} />
        )}
        {!hasBirthData && !cosmosLoading && !showIntro && (
          <div className="onboarding">
            <h1 className="onboarding-title">
              <span className="title-the">{t('onboarding.the')}</span>
              <span className="title-seer">{t('onboarding.seer')}</span>
            </h1>
            <div className="onboarding-form">
              <BirthDataForm onSubmit={handleBirthDataSubmit} />
            </div>
          </div>
        )}
        {!hasBirthData && cosmosLoading && (
          <div className="cosmos-status cosmos-status--center" role="status">
            <div className="seer-loading">
              <div className="seer-loading__stars">
                <svg className="seer-loading__star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="currentColor" />
                </svg>
                <svg className="seer-loading__star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="currentColor" />
                </svg>
                <svg className="seer-loading__star" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 0 L14 9 L24 12 L14 15 L12 24 L10 15 L0 12 L10 9 Z" fill="currentColor" />
                </svg>
              </div>
              <p className="seer-loading__text">{t('onboarding.loading')}</p>
            </div>
          </div>
        )}
        {hasBirthData && cosmosError && !cosmosLoading && (
          <p className="cosmos-status cosmos-status--warn">{t('onboarding.warnPrecision')}</p>
        )}

        {/* ══════════════════════════════════════════════
            THE SEER CORE — persistent eye + tabs + question
            ══════════════════════════════════════════════ */}
        {hasBirthData && (
          <>
            <div className="seer-core">
              {/* Seer acknowledgment — always shown when eye is open */}
              {seerPhase === 'open' && userProfile && (
                <div className="seer-acknowledgment">
                  <p className="seer-acknowledgment-line">{t('oracle.acknowledge', { name: userProfile.birthData.name })}</p>
                  <p className={`seer-acknowledgment-action${todayVisionCount >= 2 ? ' seer-acknowledgment-action--vision' : ''}`}>
                    {todayVisionCount >= 3
                      ? t('vision.noLimit')
                      : todayVisionCount >= 2
                        ? t('vision.oneLeft')
                        : t('oracle.acknowledgeAction')}
                  </p>
                </div>
              )}

              {/* Contextual hint */}
              {activeHint && seerPhase === 'open' && (
                <p className="contextual-hint" role="status" aria-live="polite">{activeHint}</p>
              )}

              {/* The Eye — always present, always watching */}
              <div className={`eye-section ${cosmicMoodClass}`}>
                <SeerEye
                  state={getEyeState()}
                  onGazeComplete={handleGazeComplete}
                />
              </div>

              {/* Inline Tabs — directly below the eye */}
              <InlineTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                hasTransitAlert={hasTransitAlert}
              />

              {/* Submitted question while gazing */}
              {seerPhase === 'gazing' && submittedQuestion && (
                <p className="current-question">{'\u201C'}{submittedQuestion}{'\u201D'}</p>
              )}

              {/* Question input — visible when eye is open and question is ready */}
              {seerPhase === 'open' && isQuestionReady && (
                <div className="input-container">
                  <QuestionInput
                    value={questionText}
                    onChange={handleQuestionChange}
                    onSubmit={handleSubmitQuestion}
                    disabled={false}
                    error={questionError}
                    customPlaceholder={getPlaceholder()}
                  />
                  {renderSuggestedQuestions()}
                </div>
              )}

              {/* Bonds: no partner selected message */}
              {seerPhase === 'open' && activeTab === 'bonds' && !bondPartner && (
                <p className="seer-no-partner">{t('bonds.choose')}</p>
              )}

              {/* ── Answer Display (unified across all tabs) ── */}
              {seerPhase === 'revealing' && oracleText && !showArticle && (
                <div className="seer-answer-container" ref={answerRef} aria-live="polite">
                  {submittedQuestion && !crisisDetected && (
                    <p className="seer-answer-question">{submittedQuestion}</p>
                  )}
                  <div className="seer-answer-text" style={crisisDetected ? { whiteSpace: 'pre-line' } : undefined}>
                    {!crisisDetected && <span className="seer-answer-quote">{'\u201C'}</span>}
                    {oracleText}
                    {!crisisDetected && <span className="seer-answer-quote">{'\u201D'}</span>}
                  </div>

                  {/* Oracle-only: follow-ups (suppressed during crisis) */}
                  {activeTab === 'oracle' && !crisisDetected && (
                    <>
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

                      {followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change') && !showFollowUps && (
                        <button className="seer-learn-more" onClick={() => setShowFollowUps(true)}>
                          {t('oracle.learnMore')}
                        </button>
                      )}

                      {followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change') && showFollowUps && (
                        <div className="seer-follow-ups">
                          {oracleArticle && !followUpText && (
                            <button className="seer-follow-up-question" onClick={() => setShowArticle(true)}>
                              <span className="seer-follow-up-question-icon">{'\u203A'}</span>
                              <span className="seer-follow-up-question-text">{t('oracle.whyOracle')}</span>
                            </button>
                          )}
                          {contextualQuestions.map((q, i) => (
                            <button key={i} className="seer-follow-up-question" onClick={() => handleContextualQuestion(q)}>
                              <span className="seer-follow-up-question-icon">{'\u203A'}</span>
                              <span className="seer-follow-up-question-text">{q.text}</span>
                            </button>
                          ))}
                          {followUpType !== 'when_change' && (
                            <button className="seer-follow-up-question seer-follow-up-question--timing" onClick={() => handleFollowUp('when_change')}>
                              <span className="seer-follow-up-question-icon">{'\u29D7'}</span>
                              <span className="seer-follow-up-question-text">{t('oracle.whenChange')}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {!(followUpRound < 2 && (contextualQuestions.length > 0 || followUpType !== 'when_change')) && followUpRound > 0 && (
                        <p className="seer-follow-up-exhausted">{t('oracle.exhausted')}</p>
                      )}
                    </>
                  )}

                  {/* Vision hint — subtle fade after answer (suppressed during crisis) */}
                  {!crisisDetected && showVisionHint && todayVisionCount === 2 && (
                    <p className="seer-vision-hint">{t('vision.twoCast')}</p>
                  )}
                  {!crisisDetected && showVisionHint && todayVisionCount >= 3 && (
                    <p className="seer-vision-hint seer-vision-hint--no-limit">{t('vision.noLimit')}</p>
                  )}

                  {/* Bottom actions */}
                  <div className="seer-answer-actions">
                    <button className="seer-ask-again-btn" onClick={handleAskAgain}>
                      {t('oracle.askAgain')}
                    </button>
                    {activeTab === 'oracle' && !crisisDetected && (
                      <button className="seer-share-icon" onClick={handleShare} aria-label="Share reading">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M8 10V2M8 2L5 5M8 2L11 5" />
                          <path d="M3 9V13H13V9" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {shareToast && <div className="seer-share-toast" role="status" aria-live="polite">{t('oracle.copied')}</div>}
                  <canvas ref={shareCanvasRef} style={{ display: 'none' }} />
                </div>
              )}

              {/* Article view (oracle only) */}
              {seerPhase === 'revealing' && showArticle && oracleArticle && activeTab === 'oracle' && (
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
                    <button className="seer-ask-again-btn" onClick={handleAskAgain}>
                      {t('general.dismiss')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════
                TAB CONTENT — scrollable below the seer core
                ══════════════════════════════════════════════ */}
            <div className="tab-content">
              {/* Oracle footer */}
              {activeTab === 'oracle' && seerPhase === 'open' && !cosmosLoading && (
                <div className="oracle-card__footer">
                  {cosmicWhisper && <p className="cosmic-whisper">{cosmicWhisper}</p>}
                  {cosmicHint && !cosmicWhisper && <p className="cosmic-hint">{cosmicHint}</p>}
                  {activeRetrogrades.length > 0 && (
                    <div className="retrograde-alert">
                      {activeRetrogrades.map(r => (
                        <span key={r.planet} className="retrograde-badge">
                          {r.planet.charAt(0).toUpperCase() + r.planet.slice(1)} Rx
                        </span>
                      ))}
                    </div>
                  )}
                  {isSpecialMoonPhase && (
                    <div className="moon-ritual-hint">
                      <span className="moon-ritual-icon">{isSpecialMoonPhase === 'New Moon' ? '\u{1F311}' : '\u{1F315}'}</span>
                      <span className="moon-ritual-text">
                        {isSpecialMoonPhase === 'New Moon' ? t('ritual.newMoon') : t('ritual.fullMoon')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Cosmos */}
              {activeTab === 'cosmos' && dailyReport && (
                <CosmicDashboard report={dailyReport} onRefresh={refreshDailyReport} mode="inline" />
              )}
              {activeTab === 'cosmos' && !dailyReport && (
                <p className="cosmos-status">{t('onboarding.loading')}</p>
              )}

              {/* Chart */}
              {activeTab === 'chart' && userProfile && (
                <NatalChartView
                  natalChart={userProfile.natalChart}
                  userProfile={userProfile}
                  dailyReport={dailyReport}
                  mode="inline"
                />
              )}

              {/* Bonds */}
              {activeTab === 'bonds' && userProfile && (
                <CompatibilityView
                  activeProfile={userProfile}
                  allProfiles={allProfiles}
                  onAddProfile={() => setSettingsView('add')}
                  onPartnerSelect={handlePartnerSelect}
                  onPartnerDeselect={handlePartnerDeselect}
                  selectedPartner={bondPartner}
                />
              )}
            </div>
          </>
        )}

        {/* ── Site footer ── */}
        <footer className="app-footer">
          <div className="app-footer-inner">
            <span className="app-footer-brand">The Seer</span>
            <span className="app-footer-sep">&middot;</span>
            <a href="/terms.html" className="app-footer-link">{t('footer.terms')}</a>
            <span className="app-footer-sep">&middot;</span>
            <a href="/privacy.html" className="app-footer-link">{t('footer.privacy')}</a>
          </div>
          <p className="app-footer-disclaimer">{t('footer.disclaimer')}</p>
        </footer>
      </main>

      {/* Settings modal */}
      {settingsView !== 'hidden' && (
        <div className="modal-overlay" onClick={() => { setSettingsView('hidden'); setEditingProfileId(null); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" ref={modalRef} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="settings-modal-title">{settingsView === 'settings' ? t('settings.title') : settingsView === 'edit' ? t('settings.editProfile') : t('settings.newProfile')}</h2>
              <button className="close-btn" onClick={() => { setSettingsView('hidden'); setEditingProfileId(null); }} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {settingsView === 'settings' && (
              <div className="settings-content">
                <div className="settings-row">
                  <span className="settings-row-label">{t('settings.sound')}</span>
                  <button
                    className={`settings-toggle ${!isMuted ? 'settings-toggle--on' : ''}`}
                    onClick={toggleMute}
                    role="switch"
                    aria-checked={!isMuted}
                    aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">{t('settings.language')}</span>
                  <div className="lang-switcher">
                    {(['en', 'ja'] as Language[]).map(l => (
                      <button key={l} className={`lang-btn ${lang === l ? 'lang-btn--active' : ''}`} onClick={() => { playClick(); setLang(l); }}>
                        {LANGUAGE_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="settings-row settings-row--link" onClick={() => { playClick(); setShowHistory(true); }}>
                  <span className="settings-row-label">{t('settings.history')}</span>
                  <span className="settings-row-chevron">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                </button>
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
                <div className="settings-legal">
                  <a href="/terms.html" className="settings-legal-link">{t('footer.terms')}</a>
                  <span className="settings-legal-sep">&middot;</span>
                  <a href="/privacy.html" className="settings-legal-link">{t('footer.privacy')}</a>
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
    </div>
  );
}

export default App;
