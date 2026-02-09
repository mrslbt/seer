/**
 * Today's Bond — Daily oracle pulse for a synastry pair.
 *
 * A breathing apparition that materializes from the void each day,
 * showing the energetic weather between two people right now.
 * No card, no container — just light and typography emerging from darkness.
 */

import { useEffect, useState } from 'react';
import './TodaysBond.css';

// ============================================
// TYPES
// ============================================

export type BondMood =
  | 'electric'    // charged, high-frequency
  | 'tender'      // soft, open, vulnerable
  | 'volatile'    // unstable, reactive
  | 'still'       // calm, waiting, potential
  | 'magnetic'    // pulling, inevitable
  | 'fated'       // destined, karmic weight
  | 'restless'    // uneasy, seeking
  | 'raw'         // exposed, unfiltered
  | 'expanding'   // growth, opening
  | 'dissolving'; // boundaries softening

export interface TodaysBondData {
  mood: BondMood;
  pulseScore: number;          // 0-100 daily fluctuating score
  transitLines: string[];      // 1-2 oracle-voice transit descriptions
  moonPhase: string;           // e.g. "waxing crescent"
  moonIllumination: number;    // 0-100
  ritual: string;              // one-sentence oracle advice
  person1Name: string;
  person2Name: string;
}

interface TodaysBondProps {
  data: TodaysBondData;
}

// ============================================
// MOOD VISUAL CONFIG
// ============================================

interface MoodVisual {
  hue: number;
  saturation: number;
  lightness: number;
}

const MOOD_VISUALS: Record<BondMood, MoodVisual> = {
  electric:   { hue: 45,  saturation: 75, lightness: 58 },
  tender:     { hue: 30,  saturation: 50, lightness: 55 },
  volatile:   { hue: 0,   saturation: 45, lightness: 50 },
  still:      { hue: 220, saturation: 20, lightness: 60 },
  magnetic:   { hue: 280, saturation: 40, lightness: 55 },
  fated:      { hue: 45,  saturation: 80, lightness: 60 },
  restless:   { hue: 15,  saturation: 50, lightness: 52 },
  raw:        { hue: 350, saturation: 40, lightness: 48 },
  expanding:  { hue: 160, saturation: 35, lightness: 52 },
  dissolving: { hue: 240, saturation: 30, lightness: 55 },
};

// ============================================
// COMPONENT
// ============================================

export default function TodaysBond({ data }: TodaysBondProps) {
  const [visible, setVisible] = useState(false);
  const visual = MOOD_VISUALS[data.mood];

  // Stagger entrance
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Mood color as CSS custom properties
  const moodColor = `hsl(${visual.hue}, ${visual.saturation}%, ${visual.lightness}%)`;
  const moodGlow = `hsla(${visual.hue}, ${visual.saturation}%, ${visual.lightness}%, 0.15)`;
  const moodGlowStrong = `hsla(${visual.hue}, ${visual.saturation}%, ${visual.lightness}%, 0.3)`;

  // Pulse ring: SVG circle stroke-dasharray
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - data.pulseScore / 100);

  return (
    <div
      className={`todays-bond ${visible ? 'todays-bond--visible' : ''}`}
      style={{
        '--bond-mood-color': moodColor,
        '--bond-mood-glow': moodGlow,
        '--bond-mood-glow-strong': moodGlowStrong,
        '--bond-mood-hue': visual.hue,
      } as React.CSSProperties}
    >
      {/* Atmospheric backdrop */}
      <div className="todays-bond__atmosphere" />

      {/* Header label */}
      <div className="todays-bond__header">
        how you feel today
      </div>

      {/* Ring with score inside */}
      <div className="todays-bond__sigil">
        <svg
          className="todays-bond__ring"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
          {/* Pulse arc */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="var(--bond-mood-color)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
            className="todays-bond__ring-arc"
          />
        </svg>
        <span className="todays-bond__score">{data.pulseScore}</span>
      </div>

      {/* Mood word with context */}
      <div className="todays-bond__mood-container">
        <span className="todays-bond__mood-label">the energy today</span>
        <span className="todays-bond__mood">{data.mood}</span>
      </div>

      {/* Transit lines */}
      <div className="todays-bond__transits">
        {data.transitLines.map((line, i) => (
          <p key={i} className="todays-bond__transit-line">{line}</p>
        ))}
      </div>

      {/* Ritual / advice */}
      <div className="todays-bond__ritual">
        {data.ritual}
      </div>

      {/* Moon phase */}
      <div className="todays-bond__moon">
        <span className="todays-bond__moon-icon">
          {getMoonIcon(data.moonIllumination)}
        </span>
        {data.moonPhase}
      </div>
    </div>
  );
}

/** Map moon illumination to a Unicode phase icon */
function getMoonIcon(illumination: number): string {
  if (illumination < 3) return '\u{1F311}';  // new
  if (illumination < 25) return '\u{1F312}'; // waxing crescent
  if (illumination < 45) return '\u{1F313}'; // first quarter
  if (illumination < 55) return '\u{1F314}'; // waxing gibbous
  if (illumination < 70) return '\u{1F315}'; // full
  if (illumination < 85) return '\u{1F316}'; // waning gibbous
  if (illumination < 97) return '\u{1F317}'; // last quarter
  return '\u{1F318}';                        // waning crescent
}
