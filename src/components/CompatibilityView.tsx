import { useState, useCallback, useEffect, useMemo } from 'react';
import type { UserProfile } from '../types/userProfile';
import type { SynastryReport } from '../lib/synastry';
import type { CompatibilityReading } from '../lib/compatibilityReading';
import {
  calculateSynastry,
  getTierLabel,
  getTierColor,
} from '../lib/synastry';
import {
  generateCompatibilityReading,
} from '../lib/compatibilityReading';
import { calculateTodaysBond } from '../lib/todaysBond';
import TodaysBond from './TodaysBond';
import type { TodaysBondData } from './TodaysBond';
import { ZODIAC_SYMBOLS } from '../lib/astroEngine';
import { playClick, playReveal } from '../lib/sounds';
import { useI18n } from '../i18n/I18nContext';
import './CompatibilityView.css';

// ============================================
// TYPES
// ============================================

interface CompatibilityViewProps {
  activeProfile: UserProfile;
  allProfiles: UserProfile[];
  onAddProfile: () => void;
  onPartnerSelect: (partner: UserProfile, report: SynastryReport) => void;
  onPartnerDeselect: () => void;
  selectedPartner: UserProfile | null;
}

type BondPhase =
  | 'select'           // Pick a partner
  | 'summoning'        // Computing synastry
  | 'reading';         // Reading revealed

// ============================================
// COMPONENT
// ============================================

export function CompatibilityView({
  activeProfile, allProfiles, onAddProfile,
  onPartnerSelect, onPartnerDeselect, selectedPartner,
}: CompatibilityViewProps) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<BondPhase>(selectedPartner ? 'reading' : 'select');
  const [partner, setPartner] = useState<UserProfile | null>(selectedPartner);
  const [report, setReport] = useState<SynastryReport | null>(null);
  const [reading, setReading] = useState<CompatibilityReading | null>(null);
  const [todaysBond, setTodaysBond] = useState<TodaysBondData | null>(null);
  const readingRef = useCallback((node: HTMLDivElement | null) => {
    if (node && phase === 'reading') {
      setTimeout(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
    }
  }, [phase]);

  // Others = all profiles minus active
  const others = allProfiles.filter(p => p.id !== activeProfile.id);
  const hasOthers = others.length > 0;

  // Pair label shown above the reading
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

  // Restore reading if selectedPartner is set on mount/change
  useEffect(() => {
    if (selectedPartner && !report) {
      const synastryReport = calculateSynastry(activeProfile, selectedPartner);
      const compatReading = generateCompatibilityReading(synastryReport);
      const dailyBond = calculateTodaysBond(activeProfile, selectedPartner, synastryReport);
      setPartner(selectedPartner);
      setReport(synastryReport);
      setReading(compatReading);
      setTodaysBond(dailyBond);
      setPhase('reading');
    }
  }, [selectedPartner, activeProfile, report]);

  // ---- Select partner ----
  const handleSelectPartner = useCallback((p: UserProfile) => {
    playClick();
    setPartner(p);
    setPhase('summoning');

    // Compute synastry immediately
    setTimeout(() => {
      playReveal();
      const synastryReport = calculateSynastry(activeProfile, p);
      const compatReading = generateCompatibilityReading(synastryReport);
      const dailyBond = calculateTodaysBond(activeProfile, p, synastryReport);
      setReport(synastryReport);
      setReading(compatReading);
      setTodaysBond(dailyBond);
      setPhase('reading');

      // Notify parent — enables bond question input in App.tsx
      onPartnerSelect(p, synastryReport);
    }, 800); // Brief delay for summoning feel
  }, [activeProfile, onPartnerSelect]);

  // ---- Back to selection ----
  const handleBack = useCallback(() => {
    playClick();
    setPhase('select');
    setPartner(null);
    setReport(null);
    setReading(null);
    setTodaysBond(null);
    onPartnerDeselect();
  }, [onPartnerDeselect]);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="compat-view">
      {/* ---- Pair label above reading ---- */}
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

      {/* ---- Phase: Select ---- */}
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
                {t('bonds.addProfile')}
              </button>
            </div>
          ) : (
            <div className="compat-empty">
              <p className="compat-empty-text">
                {t('bonds.addPrompt')}
              </p>
              <button className="compat-add-btn" onClick={onAddProfile}>
                {t('bonds.addProfile')}
              </button>
            </div>
          )}
        </>
      )}

      {/* ---- Phase: Summoning ---- */}
      {phase === 'summoning' && (
        <div className="compat-summoning">
          <p className="compat-summoning-text">{t('oracle.deeper')}</p>
        </div>
      )}

      {/* ---- Phase: Reading revealed ---- */}
      {phase === 'reading' && report && reading && (
        <div className="compat-reading-container" ref={readingRef}>
          {/* Tier badge */}
          <div className="compat-tier" style={{ color: getTierColor(report.tier) }}>
            {getTierLabel(report.tier)}
          </div>

          {/* Score */}
          <div className="compat-score" style={{ color: getTierColor(report.tier) }}>
            <span className="compat-score-num">{report.score}</span>
            <span className="compat-score-label">{t('bonds.resonance')}</span>
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
              <h3 className="compat-section-label">{t('bonds.draws')}</h3>
              {report.strengths.map((s, i) => (
                <p key={i} className="compat-section-item compat-section-item--strength">{s}</p>
              ))}
            </div>
          )}

          {/* Challenges */}
          {report.challenges.length > 0 && (
            <div className="compat-section">
              <h3 className="compat-section-label">{t('bonds.tests')}</h3>
              {report.challenges.map((c, i) => (
                <p key={i} className="compat-section-item compat-section-item--challenge">{c}</p>
              ))}
            </div>
          )}

          {/* Theme pills */}
          {(() => {
            const topThemes = report.themes.filter(th => th.score > 2).slice(0, 5);
            return topThemes.length > 0 ? (
              <div className="compat-themes">
                {topThemes.map((th) => (
                  <span
                    key={th.theme}
                    className="compat-theme-pill"
                    style={{ borderColor: `${getTierColor(report.tier)}33`, color: getTierColor(report.tier) }}
                  >
                    {th.label}
                    <span className="compat-theme-score">
                      {th.score >= 7 ? t('bonds.strong') : th.score >= 4 ? t('bonds.present') : t('bonds.subtle')}
                    </span>
                  </span>
                ))}
              </div>
            ) : null;
          })()}

          {/* Element harmony */}
          <div className="compat-element">
            <h3 className="compat-section-label">{t('bonds.harmony')}</h3>
            <p className="compat-element-text">{report.elementHarmony.description}</p>
          </div>

          {/* Today's Bond — daily layer */}
          {todaysBond && <TodaysBond data={todaysBond} />}

          {/* Actions */}
          <div className="compat-actions">
            <button className="compat-back-link" onClick={handleBack}>
              {t('bonds.chooseAnother')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
