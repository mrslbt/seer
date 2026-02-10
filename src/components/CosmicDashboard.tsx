import { useState, useEffect, useCallback } from 'react';
import type { PersonalDailyReport } from '../lib/personalDailyReport';
import type { QuestionCategory } from '../types/astrology';
import { generateInsightArticle, getScoreLabel } from '../lib/insightArticle';
import { CATEGORY_META, getScoreColor, getEnergyLabel, getOverallDescriptor } from '../lib/dashboardHelpers';
import { useI18n } from '../i18n/I18nContext';
import './CosmicDashboard.css';

interface CosmicDashboardProps {
  report: PersonalDailyReport;
  onClose?: () => void;
  onRefresh: () => void;
  mode?: 'overlay' | 'inline';
}

// SVG arc calculation for the overall score ring
const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function getArcOffset(score: number): number {
  const fraction = score / 10;
  return RING_CIRCUMFERENCE * (1 - fraction);
}

export function CosmicDashboard({ report, onClose, onRefresh, mode = 'overlay' }: CosmicDashboardProps) {
  const { t } = useI18n();
  const [expandedCategory, setExpandedCategory] = useState<keyof PersonalDailyReport['categories'] | null>(null);
  const isInline = mode === 'inline';

  // Escape key handler (only in overlay mode)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (expandedCategory) {
        setExpandedCategory(null);
      } else {
        onClose?.();
      }
    }
  }, [expandedCategory, onClose]);

  useEffect(() => {
    if (isInline) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isInline]);

  // ---- Detail View ----
  if (expandedCategory) {
    const catScore = report.categories[expandedCategory];
    const meta = CATEGORY_META.find(c => c.key === expandedCategory)!;
    const article = generateInsightArticle(expandedCategory as QuestionCategory, report);
    const scoreColor = getScoreColor(catScore.score);

    return (
      <div className={isInline ? 'dashboard-inline' : 'dashboard-overlay'} role={isInline ? undefined : 'dialog'} aria-modal={isInline ? undefined : true} aria-label={isInline ? undefined : `${meta.displayName} details`}>
        <div className="dashboard-container dashboard-detail">
          <button className="detail-back" onClick={() => setExpandedCategory(null)}>
            {'←'} {t('cosmos.back')}
          </button>

          <div className="detail-header">
            <div className="detail-category-name">
              <span className="detail-icon">{meta.planetName}</span>
              <h2 className="detail-title" style={{ color: scoreColor }}>{article.title}</h2>
            </div>
            <div className="detail-score-row">
              <span className="detail-score-value" style={{ color: scoreColor }}>{catScore.score}</span>
              <span className="detail-score-max">/10</span>
              <span className="detail-score-label">{getScoreLabel(catScore.score)}</span>
            </div>
          </div>

          <div className="detail-body">
            {article.sections.map((section, i) => (
              <div key={i} className="detail-section">
                <h3 className="detail-section-heading">{section.heading}</h3>
                <p className="detail-section-body">{section.body}</p>
              </div>
            ))}
          </div>

          <button className="detail-back" onClick={() => setExpandedCategory(null)}>
            {'←'} {t('cosmos.back')}
          </button>
        </div>
      </div>
    );
  }

  // ---- Main Dashboard View ----
  const overallColor = getScoreColor(report.overallScore);

  return (
    <div className={isInline ? 'dashboard-inline' : 'dashboard-overlay'} role={isInline ? undefined : 'dialog'} aria-modal={isInline ? undefined : true} aria-label={isInline ? undefined : 'Cosmic Dashboard'}>
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          {isInline ? (
            <div style={{ width: 32 }} />
          ) : (
            <button className="dashboard-close" onClick={onClose} aria-label="Close dashboard">
              {'✕'}
            </button>
          )}
          <div className="dashboard-title">
            <span className="dashboard-title-sub">{t('cosmos.your')}</span>
            <span className="dashboard-title-main">{t('cosmos.title')}</span>
          </div>
          <button className="dashboard-refresh" onClick={onRefresh} aria-label="Refresh data">
            {'↻'}
          </button>
        </div>

        {/* Overall Score */}
        <div className="dashboard-overall">
          <div className="overall-score-ring">
            <svg className="overall-score-svg" viewBox="0 0 96 96">
              <circle
                className="overall-score-track"
                cx="48" cy="48" r={RING_RADIUS}
              />
              <circle
                className="overall-score-arc"
                cx="48" cy="48" r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={getArcOffset(report.overallScore)}
              />
            </svg>
            <span className="overall-score-value" style={{ color: overallColor }}>
              {report.overallScore}
            </span>
          </div>
          <span className="overall-energy-label">{getEnergyLabel(report.overallScore)}</span>
          <p className="overall-headline">{getOverallDescriptor(report.overallEnergy)}</p>
        </div>

        {/* Category Grid */}
        <div className="dashboard-categories">
          {CATEGORY_META.map((cat) => {
            const score = report.categories[cat.key];
            const color = getScoreColor(score.score);
            const isStrong = score.score >= 7;

            return (
              <button
                key={cat.key}
                className={`category-card ${isStrong ? 'category-card--strong' : ''}`}
                onClick={() => setExpandedCategory(cat.key)}
              >
                <div className="category-card-top">
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-name">{cat.displayName}</span>
                  <span className="category-score" style={{ color }}>{score.score}</span>
                </div>
                <div className="category-bar-track">
                  <div
                    className="category-bar-fill"
                    style={{ width: `${score.score * 10}%`, background: color }}
                  />
                </div>
                <span className="category-advice">{score.advice}</span>
              </button>
            );
          })}
        </div>

        {/* Moon Phase */}
        <div className="dashboard-section">
          <h3 className="section-label">{t('cosmos.lunar')}</h3>
          <div className="moon-row">
            <span className="moon-name">{report.moonPhase.name}</span>
          </div>
          <p className="moon-advice">{report.moonPhase.advice}</p>
        </div>

        {/* Key Transits */}
        {report.keyTransits.length > 0 && (
          <div className="dashboard-section">
            <h3 className="section-label">{t('cosmos.transits')}</h3>
            {report.keyTransits.map((tr, i) => (
              <div key={i} className="transit-row">
                <span className={`transit-impact transit-impact--${tr.impact}`}>
                  {tr.impact === 'positive' ? '↑' : tr.impact === 'negative' ? '↓' : '↔'}
                </span>
                <span className="transit-text">{tr.interpretation}</span>
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Transits — what's coming */}
        {(() => {
          const upcoming = report.keyTransits
            .filter(tr => tr.timing?.isApplying && tr.timing?.daysUntilExact != null && tr.timing.daysUntilExact > 0)
            .sort((a, b) => (a.timing?.daysUntilExact ?? 99) - (b.timing?.daysUntilExact ?? 99))
            .slice(0, 4);
          return upcoming.length > 0 ? (
            <div className="dashboard-section">
              <h3 className="section-label">{t('cosmos.coming')}</h3>
              {upcoming.map((tr, i) => {
                const days = tr.timing!.daysUntilExact!;
                const dayLabel = days === 1 ? t('cosmos.tomorrow') : t('cosmos.inDays', { days: String(days) });
                return (
                  <div key={i} className="upcoming-row">
                    <span className="upcoming-when">{dayLabel}</span>
                    <span className="upcoming-text">{tr.interpretation}</span>
                    <span className={`transit-impact transit-impact--${tr.impact}`}>
                      {tr.impact === 'positive' ? '↑' : tr.impact === 'negative' ? '↓' : '↔'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : null;
        })()}

        {/* Retrogrades */}
        {report.retrogrades.length > 0 && (
          <div className="dashboard-section">
            <h3 className="section-label">{t('cosmos.retrogrades')}</h3>
            {report.retrogrades.map((r, i) => (
              <div key={i} className="retrograde-row">
                <span className="retrograde-planet">
                  {r.planet.charAt(0).toUpperCase() + r.planet.slice(1)} Rx
                </span>
                <span className="retrograde-advice">{r.advice}</span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p className="dashboard-timestamp">
          {t('cosmos.updated', { time: new Date(report.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}
        </p>
      </div>
    </div>
  );
}
