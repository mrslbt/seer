/**
 * Today's Bond — Daily oracle pulse for a synastry pair.
 *
 * Left-aligned section that matches the reading flow above.
 * Every element is self-labelled — no ambiguity, no learning curve.
 * The void breathes through subtle animation, not decoration.
 */

import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/en';
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
// MOOD → COLOR MAPPING
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

// Mood → i18n keys for descriptors
const MOOD_DESCRIPTOR_KEY: Record<BondMood, TranslationKey> = {
  electric:   'mood.electric',
  tender:     'mood.tender',
  volatile:   'mood.volatile',
  still:      'mood.still',
  magnetic:   'mood.magnetic',
  fated:      'mood.fated',
  restless:   'mood.restless',
  raw:        'mood.raw',
  expanding:  'mood.expanding',
  dissolving: 'mood.dissolving',
};

// ============================================
// COMPONENT
// ============================================

export default function TodaysBond({ data }: TodaysBondProps) {
  const { t } = useI18n();
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

  // Pulse intensity label
  const pulseLabel =
    data.pulseScore >= 75 ? t('todayBond.intense') :
    data.pulseScore >= 50 ? t('todayBond.active') :
    data.pulseScore >= 25 ? t('todayBond.gentle') :
    t('todayBond.quiet');

  return (
    <div
      className={`todays-bond ${visible ? 'todays-bond--visible' : ''}`}
      style={{
        '--bond-mood-color': moodColor,
        '--bond-mood-glow': moodGlow,
      } as React.CSSProperties}
    >
      {/* Section label — matches compat-section-label pattern */}
      <h3 className="todays-bond__label">{t('todayBond.energy')}</h3>

      {/* Pulse score — thin bar + number, immediately readable */}
      <div className="todays-bond__pulse-row">
        <div className="todays-bond__pulse-info">
          <span className="todays-bond__pulse-number">{data.pulseScore}</span>
          <span className="todays-bond__pulse-desc">{pulseLabel}</span>
        </div>
        <div className="todays-bond__pulse-track">
          <div
            className="todays-bond__pulse-fill"
            style={{ width: `${Math.max(4, data.pulseScore)}%` }}
          />
        </div>
      </div>

      {/* Mood — contextual sentence, not a naked word */}
      <div className="todays-bond__mood-row">
        <span className="todays-bond__mood-prefix">{t('todayBond.mood')}</span>
        <span className="todays-bond__mood-word">{data.mood}</span>
        <span className="todays-bond__mood-meaning">{t(MOOD_DESCRIPTOR_KEY[data.mood])}</span>
      </div>

      {/* Transit insights — what's actually happening astronomically */}
      {data.transitLines.length > 0 && (
        <div className="todays-bond__section">
          <span className="todays-bond__section-label">{t('todayBond.happening')}</span>
          {data.transitLines.map((line, i) => (
            <p key={i} className="todays-bond__transit-line">{line}</p>
          ))}
        </div>
      )}

      {/* Ritual / advice — clearly labelled */}
      <div className="todays-bond__section">
        <span className="todays-bond__section-label">{t('todayBond.advice')}</span>
        <p className="todays-bond__advice">{data.ritual}</p>
      </div>

      {/* Moon phase — quiet footnote */}
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
