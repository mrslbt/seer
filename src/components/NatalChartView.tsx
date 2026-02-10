/**
 * NatalChartView — overlay showing the user's natal planet placements and houses.
 * List-based layout (not circular wheel), mobile-friendly.
 */

import { useCallback, useEffect } from 'react';
import type { NatalChart, PlanetPosition, Planet } from '../types/userProfile';
import type { ZodiacSign } from '../types/astrology';
import { HOUSE_MEANINGS } from '../lib/personalDailyReport';
import { getHouseForLongitude } from '../lib/ephemerisService';
import './NatalChartView.css';

interface NatalChartViewProps {
  natalChart: NatalChart;
  onClose?: () => void;
  mode?: 'overlay' | 'inline';
}

// ---- Glyph maps ----

const PLANET_GLYPHS: Record<Planet, string> = {
  sun: '\u2609',        // ☉
  moon: '\u263D',       // ☽
  mercury: '\u263F',    // ☿
  venus: '\u2640',      // ♀
  mars: '\u2642',       // ♂
  jupiter: '\u2643',    // ♃
  saturn: '\u2644',     // ♄
  uranus: '\u2645',     // ♅
  neptune: '\u2646',    // ♆
  pluto: '\u2647',      // ♇
  ascendant: 'AC',
  midheaven: 'MC',
  northNode: '\u260A',  // ☊
  chiron: '\u26B7',     // ⚷
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
  Aries: '\u2648',
  Taurus: '\u2649',
  Gemini: '\u264A',
  Cancer: '\u264B',
  Leo: '\u264C',
  Virgo: '\u264D',
  Libra: '\u264E',
  Scorpio: '\u264F',
  Sagittarius: '\u2650',
  Capricorn: '\u2651',
  Aquarius: '\u2652',
  Pisces: '\u2653',
};

// What each planet represents (plain English for non-astrologers)
const PLANET_MEANING: Record<Planet, string> = {
  sun: 'Your core identity',
  moon: 'Your emotions and inner world',
  mercury: 'How you think and communicate',
  venus: 'How you love and what you value',
  mars: 'Your drive and how you take action',
  jupiter: 'Where you find luck and growth',
  saturn: 'Your discipline and life lessons',
  uranus: 'Where you break the rules',
  neptune: 'Your dreams and intuition',
  pluto: 'Your deepest transformation',
  ascendant: 'How the world sees you',
  midheaven: 'Your public image and career path',
  northNode: "Your soul's direction",
  chiron: 'Your deepest wound and healing gift',
};

// Sign qualities (one-line descriptor)
const SIGN_QUALITY: Record<string, string> = {
  Aries: 'bold, direct, action-driven',
  Taurus: 'steady, sensual, grounded',
  Gemini: 'curious, adaptable, expressive',
  Cancer: 'nurturing, intuitive, protective',
  Leo: 'confident, creative, warm',
  Virgo: 'precise, practical, devoted',
  Libra: 'harmonious, fair, relationship-oriented',
  Scorpio: 'intense, transformative, deep',
  Sagittarius: 'adventurous, philosophical, free',
  Capricorn: 'ambitious, disciplined, strategic',
  Aquarius: 'independent, visionary, unconventional',
  Pisces: 'empathetic, dreamy, spiritually attuned',
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
            <span className="chart-title-sub">Your</span>
            <span className="chart-title-main">Natal Chart</span>
          </div>
          {!isInline && (
            <button className="chart-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        {/* Ascendant & Midheaven */}
        <section className="chart-section">
          <h3 className="chart-section-label">Key Points</h3>
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
                    {PLANET_MEANING[key]}: {SIGN_QUALITY[pos.sign] || pos.sign.toLowerCase()}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Planet Placements */}
        <section className="chart-section">
          <h3 className="chart-section-label">Planets</h3>
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
                        <span className="chart-planet-house">{ordinal(house)} house</span>
                      )}
                    </div>
                  </div>
                  <div className="chart-planet-interp">
                    {PLANET_MEANING[key]}: {SIGN_QUALITY[pos.sign] || pos.sign.toLowerCase()}
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
              Houses
              <span className="chart-house-system">
                {natalChart.houses.system === 'P' ? 'Placidus' : 'Whole Sign'}
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
