/**
 * NatalChartView — overlay showing the user's natal planet placements and houses.
 * Redesigned: Big Three hero, LLM personality reading, grouped planet rows, compact house grid.
 * Mobile-first (320-420px), dark luxury aesthetic.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import type { NatalChart, PlanetPosition, Planet, UserProfile } from '../types/userProfile';
import type { ZodiacSign } from '../types/astrology';
import { HOUSE_MEANINGS } from '../lib/personalDailyReport';
import { getHouseForLongitude } from '../lib/ephemerisService';
import { callChartReadingLLM } from '../lib/llmOracle';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/en';
import './NatalChartView.css';

interface NatalChartViewProps {
  natalChart: NatalChart;
  userProfile?: UserProfile;
  onClose?: () => void;
  mode?: 'overlay' | 'inline';
}

// ---- Glyph maps ----

const PLANET_GLYPHS: Record<Planet, string> = {
  sun: '☉',
  moon: '☽',
  mercury: '☿',
  venus: '♀',
  mars: '♂',
  jupiter: '♃',
  saturn: '♄',
  uranus: '♅',
  neptune: '♆',
  pluto: '♇',
  ascendant: 'AC',
  midheaven: 'MC',
  northNode: '☊',
  chiron: '⚷',
};

const PLANET_NAMES: Record<Planet, string> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto',
  ascendant: 'Ascendant',
  midheaven: 'Midheaven',
  northNode: 'North Node',
  chiron: 'Chiron',
};

const ZODIAC_GLYPHS: Record<ZodiacSign, string> = {
  Aries: '♈',
  Taurus: '♉',
  Gemini: '♊',
  Cancer: '♋',
  Leo: '♌',
  Virgo: '♍',
  Libra: '♎',
  Scorpio: '♏',
  Sagittarius: '♐',
  Capricorn: '♑',
  Aquarius: '♒',
  Pisces: '♓',
};

// i18n key maps
const PLANET_MEANING_KEY: Record<Planet, TranslationKey> = {
  sun: 'planet.sun', moon: 'planet.moon', mercury: 'planet.mercury',
  venus: 'planet.venus', mars: 'planet.mars', jupiter: 'planet.jupiter',
  saturn: 'planet.saturn', uranus: 'planet.uranus', neptune: 'planet.neptune',
  pluto: 'planet.pluto', ascendant: 'planet.ascendant', midheaven: 'planet.midheaven',
  northNode: 'planet.northNode', chiron: 'planet.chiron',
};

const SIGN_QUALITY_KEY: Record<string, TranslationKey> = {
  Aries: 'sign.Aries', Taurus: 'sign.Taurus', Gemini: 'sign.Gemini',
  Cancer: 'sign.Cancer', Leo: 'sign.Leo', Virgo: 'sign.Virgo',
  Libra: 'sign.Libra', Scorpio: 'sign.Scorpio', Sagittarius: 'sign.Sagittarius',
  Capricorn: 'sign.Capricorn', Aquarius: 'sign.Aquarius', Pisces: 'sign.Pisces',
};

// Planet groups for visual hierarchy
const PLANET_GROUPS: { label: string; planets: Planet[] }[] = [
  { label: 'Personal', planets: ['mercury', 'venus', 'mars'] },
  { label: 'Social',   planets: ['jupiter', 'saturn'] },
  { label: 'Outer',    planets: ['uranus', 'neptune', 'pluto'] },
  { label: 'Points',   planets: ['northNode', 'chiron'] },
];

// Big Three: Sun, Moon, Ascendant
const BIG_THREE: { key: Planet; label: string }[] = [
  { key: 'sun',       label: 'Sun' },
  { key: 'moon',      label: 'Moon' },
  { key: 'ascendant', label: 'Rising' },
];

// Element map for template fallback
const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water',
};

function formatDegree(degree: number): string {
  const d = Math.floor(degree);
  const m = Math.floor((degree - d) * 60);
  return `${d}°${m.toString().padStart(2, '0')}'`;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Template fallback reading based on Big Three ──
function generateFallbackReading(chart: NatalChart): string {
  const sunSign = chart.sun.sign;
  const moonSign = chart.moon.sign;
  const risingSign = chart.ascendant?.sign;

  const sunEl = SIGN_ELEMENTS[sunSign];
  const moonEl = SIGN_ELEMENTS[moonSign];

  // Build a 2-sentence personality snapshot from element combination
  const core: Record<string, string> = {
    fire: 'Something in you burns. You move toward what you want before you name it',
    earth: 'You build things that last. Patience is not something you practice. It is something you are',
    air: 'Your mind arrives before you do. Ideas pull you forward. Stillness is harder than motion',
    water: 'You feel the room before you enter it. What others miss, you carry',
  };

  const inner: Record<string, string> = {
    fire: 'Underneath, you need to be seen. Not admired. Seen',
    earth: 'Underneath, you need safety before you can give yourself away',
    air: 'Underneath, you are looking for someone who can keep up with your mind',
    water: 'Underneath, you hold more than you show. The depth is the point',
  };

  let reading = core[sunEl] + '. ' + inner[moonEl] + '.';

  if (risingSign && SIGN_ELEMENTS[risingSign] !== sunEl) {
    const risingEl = SIGN_ELEMENTS[risingSign];
    const mask: Record<string, string> = {
      fire: 'The world sees confidence first',
      earth: 'The world sees composure first',
      air: 'The world sees charm first',
      water: 'The world sees softness first',
    };
    reading += ' ' + mask[risingEl] + '.';
  }

  return reading;
}

// ── Cache key for localStorage ──
function getReadingCacheKey(profileId: string, lang: string): string {
  return `seer-chart-reading-${profileId}-${lang}`;
}

export function NatalChartView({ natalChart, userProfile, onClose, mode = 'overlay' }: NatalChartViewProps) {
  const { t, lang } = useI18n();
  const isInline = mode === 'inline';
  const [chartReading, setChartReading] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);
  const llmCalledRef = useRef(false);

  // Escape key handler (only in overlay mode)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (isInline) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isInline]);

  // ── Fetch chart reading on mount ──
  useEffect(() => {
    if (!userProfile || llmCalledRef.current) return;
    llmCalledRef.current = true;

    const cacheKey = getReadingCacheKey(userProfile.id, lang);

    // Check localStorage cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setChartReading(cached);
        return;
      }
    } catch { /* empty */ }

    // Call LLM
    setReadingLoading(true);
    callChartReadingLLM(userProfile, lang).then(result => {
      if (result.source === 'llm' && result.text) {
        setChartReading(result.text);
        try { localStorage.setItem(cacheKey, result.text); } catch { /* empty */ }
      } else {
        // Template fallback
        const fallback = generateFallbackReading(natalChart);
        setChartReading(fallback);
      }
      setReadingLoading(false);
    }).catch(() => {
      const fallback = generateFallbackReading(natalChart);
      setChartReading(fallback);
      setReadingLoading(false);
    });
  }, [userProfile, natalChart, lang]);

  const hasHouses = !!natalChart.houses;

  // Get house for a planet
  const getHouse = (pos: PlanetPosition): number | null => {
    if (!natalChart.houses) return null;
    return getHouseForLongitude(pos.longitude, natalChart.houses.cusps);
  };

  // Check if Big Three data exists
  const bigThreeData = BIG_THREE.map(({ key, label }) => {
    const pos = natalChart[key] as PlanetPosition | undefined;
    return pos ? { key, label, pos } : null;
  }).filter(Boolean) as { key: Planet; label: string; pos: PlanetPosition }[];

  const hasBigThree = bigThreeData.length >= 2; // at least sun + moon

  // Midheaven shown separately if Big Three hero is displayed (ASC is in hero)
  const midheaven = natalChart.midheaven as PlanetPosition | undefined;

  return (
    <div className={isInline ? 'chart-inline' : 'chart-overlay'} role={isInline ? undefined : 'dialog'} aria-modal={isInline ? undefined : true} aria-label={isInline ? undefined : 'Your Natal Chart'}>
      <div className="chart-container">
        {/* Header */}
        <div className="chart-header">
          <div className="chart-title">
            <span className="chart-title-sub">{t('chart.your')}</span>
            <span className="chart-title-main">{t('chart.title')}</span>
          </div>
          {!isInline && (
            <button className="chart-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        {/* Big Three Hero — Sun / Moon / Rising */}
        {hasBigThree && (
          <div className="chart-big-three">
            {bigThreeData.map(({ key, label, pos }) => (
              <div key={key} className="big-three-card">
                <span className="big-three-glyph">{PLANET_GLYPHS[key]}</span>
                <span className="big-three-label">{label}</span>
                <span className="big-three-sign">
                  <span className="big-three-zodiac">{ZODIAC_GLYPHS[pos.sign]}</span>
                  {pos.sign}
                </span>
                <span className="big-three-degree">{formatDegree(pos.degree)}</span>
                <span className="big-three-interp">
                  {SIGN_QUALITY_KEY[pos.sign] ? t(SIGN_QUALITY_KEY[pos.sign]) : pos.sign.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Chart Reading — LLM-generated personality snapshot */}
        {(chartReading || readingLoading) && (
          <div className="chart-reading">
            <div className="chart-reading-label">{t('chart.reading')}</div>
            <p className={`chart-reading-text${readingLoading ? ' chart-reading-text--loading' : ''}`}>
              {readingLoading ? '\u2026' : chartReading}
            </p>
          </div>
        )}

        {/* Midheaven — shown as single key point when Big Three hero is used */}
        {hasBigThree && midheaven && (
          <section className="chart-section">
            <h3 className="chart-section-label">{t('chart.keyPoints')}</h3>
            <div className="chart-points">
              <div className="chart-point">
                <div className="chart-point-top">
                  <span className="chart-point-glyph">{PLANET_GLYPHS.midheaven}</span>
                  <span className="chart-point-name">{PLANET_NAMES.midheaven}</span>
                  <span className="chart-point-sign">
                    <span className="zodiac-glyph">{ZODIAC_GLYPHS[midheaven.sign]}</span>
                    {midheaven.sign}
                  </span>
                  <span className="chart-point-degree">{formatDegree(midheaven.degree)}</span>
                </div>
                <div className="chart-point-interp">
                  {t(PLANET_MEANING_KEY.midheaven)}: {SIGN_QUALITY_KEY[midheaven.sign] ? t(SIGN_QUALITY_KEY[midheaven.sign]) : midheaven.sign.toLowerCase()}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Fallback: ASC + MC as key points when Big Three hero isn't available */}
        {!hasBigThree && (
          <section className="chart-section">
            <h3 className="chart-section-label">{t('chart.keyPoints')}</h3>
            <div className="chart-points">
              {(['ascendant', 'midheaven'] as Planet[]).map(key => {
                const pos = natalChart[key] as PlanetPosition | undefined;
                if (!pos) return null;
                return (
                  <div key={key} className="chart-point">
                    <div className="chart-point-top">
                      <span className="chart-point-glyph">{PLANET_GLYPHS[key]}</span>
                      <span className="chart-point-name">{PLANET_NAMES[key]}</span>
                      <span className="chart-point-sign">
                        <span className="zodiac-glyph">{ZODIAC_GLYPHS[pos.sign]}</span>
                        {pos.sign}
                      </span>
                      <span className="chart-point-degree">{formatDegree(pos.degree)}</span>
                    </div>
                    <div className="chart-point-interp">
                      {t(PLANET_MEANING_KEY[key])}: {SIGN_QUALITY_KEY[pos.sign] ? t(SIGN_QUALITY_KEY[pos.sign]) : pos.sign.toLowerCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Planet Placements — grouped */}
        <section className="chart-section">
          <h3 className="chart-section-label">{t('chart.planets')}</h3>
          <div className="chart-planets">
            {PLANET_GROUPS.map(group => {
              const rows = group.planets
                .map(key => {
                  const pos = natalChart[key] as PlanetPosition | undefined;
                  return pos ? { key, pos } : null;
                })
                .filter(Boolean) as { key: Planet; pos: PlanetPosition }[];

              if (rows.length === 0) return null;

              return (
                <div key={group.label} className="chart-planet-group">
                  <div className="chart-planet-group-label">{group.label}</div>
                  {rows.map(({ key, pos }) => {
                    const house = getHouse(pos);
                    return (
                      <div key={key} className="chart-planet-row">
                        <span className="chart-planet-glyph">{PLANET_GLYPHS[key]}</span>
                        <div className="chart-planet-info">
                          <div className="chart-planet-top">
                            <span className="chart-planet-name">{PLANET_NAMES[key]}</span>
                            <div className="chart-planet-placement">
                              <span className="chart-planet-sign">
                                <span className="zodiac-glyph">{ZODIAC_GLYPHS[pos.sign]}</span>
                                {pos.sign}
                              </span>
                              <span className="chart-planet-degree">{formatDegree(pos.degree)}</span>
                              <div className="chart-planet-badges">
                                {pos.isRetrograde && <span className="chart-rx">Rx</span>}
                                {house && (
                                  <span className="chart-planet-house">{t('chart.house', { n: ordinal(house) })}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="chart-planet-interp">
                            {t(PLANET_MEANING_KEY[key])}: {SIGN_QUALITY_KEY[pos.sign] ? t(SIGN_QUALITY_KEY[pos.sign]) : pos.sign.toLowerCase()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </section>

        {/* House Cusps */}
        {hasHouses && natalChart.houses && (
          <section className="chart-section">
            <h3 className="chart-section-label">
              {t('chart.houses')}
              <span className="chart-house-system">
                {natalChart.houses.system === 'P' ? t('chart.placidus') : t('chart.wholeSign')}
              </span>
            </h3>
            <div className="chart-houses-grid">
              {natalChart.houses.cusps.map(cusp => (
                <div key={cusp.house} className="chart-house-cell">
                  <span className="chart-house-num">{ordinal(cusp.house)}</span>
                  <div className="chart-house-info">
                    <span className="chart-house-sign">
                      <span className="zodiac-glyph">{ZODIAC_GLYPHS[cusp.sign]}</span>
                      {cusp.sign} {formatDegree(cusp.degree)}
                    </span>
                    <span className="chart-house-meaning">{HOUSE_MEANINGS[cusp.house]}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
