/**
 * NatalChartView — overlay showing the user's natal planet placements and houses.
 * List-based layout (not circular wheel), mobile-friendly.
 */

import { useCallback, useEffect } from 'react';
import type { NatalChart, PlanetPosition, Planet } from '../types/userProfile';
import type { ZodiacSign } from '../types/astrology';
import { HOUSE_MEANINGS } from '../lib/personalDailyReport';
import { getHouseForLongitude } from '../lib/ephemerisService';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/en';
import './NatalChartView.css';

interface NatalChartViewProps {
  natalChart: NatalChart;
  onClose?: () => void;
  mode?: 'overlay' | 'inline';
}

// ---- Glyph maps ----

const PLANET_GLYPHS: Record<Planet, string> = {
  sun: 'Su',
  moon: 'Mo',
  mercury: 'Me',
  venus: 'Ve',
  mars: 'Ma',
  jupiter: 'Ju',
  saturn: 'Sa',
  uranus: 'Ur',
  neptune: 'Ne',
  pluto: 'Pl',
  ascendant: 'AC',
  midheaven: 'MC',
  northNode: 'NN',
  chiron: 'Ch',
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
  Aries: 'Ar',
  Taurus: 'Ta',
  Gemini: 'Ge',
  Cancer: 'Cn',
  Leo: 'Le',
  Virgo: 'Vi',
  Libra: 'Li',
  Scorpio: 'Sc',
  Sagittarius: 'Sg',
  Capricorn: 'Cp',
  Aquarius: 'Aq',
  Pisces: 'Pi',
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

// Display order: luminaries, personal, social, outer, points
const PLANET_ORDER: Planet[] = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'northNode', 'chiron',
];

const POINT_ORDER: Planet[] = ['ascendant', 'midheaven'];

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

export function NatalChartView({ natalChart, onClose, mode = 'overlay' }: NatalChartViewProps) {
  const { t } = useI18n();
  const isInline = mode === 'inline';

  // Escape key handler (only in overlay mode)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (isInline) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, isInline]);

  const hasHouses = !!natalChart.houses;

  // Get house for a planet
  const getHouse = (pos: PlanetPosition): number | null => {
    if (!natalChart.houses) return null;
    return getHouseForLongitude(pos.longitude, natalChart.houses.cusps);
  };

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

        {/* Ascendant & Midheaven */}
        <section className="chart-section">
          <h3 className="chart-section-label">{t('chart.keyPoints')}</h3>
          <div className="chart-points">
            {POINT_ORDER.map(key => {
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

        {/* Planet Placements */}
        <section className="chart-section">
          <h3 className="chart-section-label">{t('chart.planets')}</h3>
          <div className="chart-planets">
            {PLANET_ORDER.map(key => {
              const pos = natalChart[key] as PlanetPosition | undefined;
              if (!pos) return null;
              const house = getHouse(pos);
              return (
                <div key={key} className="chart-planet-row">
                  <div className="chart-planet-top">
                    <div className="chart-planet-left">
                      <span className="chart-planet-glyph">{PLANET_GLYPHS[key]}</span>
                      <span className="chart-planet-name">{PLANET_NAMES[key]}</span>
                    </div>
                    <div className="chart-planet-right">
                      <span className="chart-planet-sign">
                        <span className="zodiac-glyph">{ZODIAC_GLYPHS[pos.sign]}</span>
                        {pos.sign}
                      </span>
                      <span className="chart-planet-degree">{formatDegree(pos.degree)}</span>
                      {pos.isRetrograde && <span className="chart-rx">Rx</span>}
                      {house && (
                        <span className="chart-planet-house">{t('chart.house', { n: ordinal(house) })}</span>
                      )}
                    </div>
                  </div>
                  <div className="chart-planet-interp">
                    {t(PLANET_MEANING_KEY[key])}: {SIGN_QUALITY_KEY[pos.sign] ? t(SIGN_QUALITY_KEY[pos.sign]) : pos.sign.toLowerCase()}
                  </div>
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
                  <span className="chart-house-sign">
                    <span className="zodiac-glyph">{ZODIAC_GLYPHS[cusp.sign]}</span>
                    {formatDegree(cusp.degree)}
                  </span>
                  <span className="chart-house-meaning">{HOUSE_MEANINGS[cusp.house]}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
