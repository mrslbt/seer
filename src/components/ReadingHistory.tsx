/**
 * ReadingHistory — The Oracle Remembers
 *
 * A journal-style overlay showing all past readings,
 * grouped by date.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Verdict } from '../types/astrology';
import { getReadingsGroupedByDate, type ReadingRecord } from '../lib/readingHistory';
import { getSeerVerdictColor } from '../lib/oracleResponse';
import { useI18n } from '../i18n/I18nContext';
import './ReadingHistory.css';

interface ReadingHistoryProps {
  onClose: () => void;
  profileId?: string;
}

export function ReadingHistory({ onClose, profileId }: ReadingHistoryProps) {
  const { t } = useI18n();
  const [groups, setGroups] = useState<{ date: string; readings: ReadingRecord[] }[]>([]);

  useEffect(() => {
    setGroups(getReadingsGroupedByDate(profileId));
  }, [profileId]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const verdictLabels: Record<Verdict, string> = {
    HARD_YES: t('history.yes'),
    SOFT_YES: t('history.leaningYes'),
    NEUTRAL: t('history.uncertain'),
    SOFT_NO: t('history.leaningNo'),
    HARD_NO: t('history.no'),
    UNCLEAR: t('history.unclear'),
  };

  const verdictIcons: Record<Verdict, string> = {
    HARD_YES: '\u2713',
    SOFT_YES: '\u223C',
    NEUTRAL: '\u25CB',
    SOFT_NO: '\u223C',
    HARD_NO: '\u2717',
    UNCLEAR: '?',
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="history-overlay" role="dialog" aria-modal="true" aria-label="Reading History">
      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <button className="history-close" onClick={onClose} aria-label="Close">&times;</button>
          <div className="history-title">
            <span className="history-title-sub">{t('history.the')}</span>
            <span className="history-title-main">{t('history.remembers')}</span>
          </div>
          <div style={{ width: 32 }} /> {/* spacer */}
        </div>

        {/* Content */}
        {groups.length === 0 ? (
          <div className="history-empty">
            <p className="history-empty-text">{t('history.empty')}</p>
            <p className="history-empty-sub">{t('history.emptyHint')}</p>
          </div>
        ) : (
          <div className="history-scroll">
            {groups.map((group, gi) => (
              <div key={gi} className="history-day-group">
                <div className="history-date-label">{group.date}</div>
                {group.readings.map((reading, ri) => (
                  <div
                    key={reading.id}
                    className="history-card"
                    style={{ animationDelay: `${0.05 * ri}s` }}
                  >
                    <div className="history-card-top">
                      <span className="history-time">{formatTime(reading.timestamp)}</span>
                      <span
                        className="history-verdict-badge"
                        style={{ color: getSeerVerdictColor(reading.verdict) }}
                      >
                        <span className="verdict-icon">{verdictIcons[reading.verdict]}</span>
                        {verdictLabels[reading.verdict]}
                      </span>
                    </div>
                    <p className="history-question">{reading.question}</p>
                    <p className="history-oracle-text" style={{ color: getSeerVerdictColor(reading.verdict) }}>
                      &ldquo;{reading.oracleText}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
