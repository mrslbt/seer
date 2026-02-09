import { useMemo } from 'react';
import type { ZodiacSign } from '../types/astrology';
import { ZODIAC_SYMBOLS } from '../lib/astroEngine';
import { SeerEye } from './SeerEye';
import { playClick } from '../lib/sounds';
import './FirstGlimpse.css';

interface FirstGlimpseProps {
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign?: ZodiacSign;
  onEnter: () => void;
}

// ============================================
// SUN DESCRIPTIONS — the conscious identity
// ============================================
const SUN_TRAITS: Record<ZodiacSign, string> = {
  Aries: 'You move through the world like a struck match — quick to ignite, impossible to ignore.',
  Taurus: 'You are the slow root that splits stone. Patience is not your weakness — it is your weapon.',
  Gemini: 'Your mind is a hall of mirrors — every thought refracts into ten more.',
  Cancer: 'You carry the ocean inside you. What others call moody, the moon calls faithful.',
  Leo: 'You were born knowing how to hold a room. The light bends toward you without being asked.',
  Virgo: 'You see the flaw in the diamond before anyone sees the diamond. Precision is your prayer.',
  Libra: 'You weigh the world on invisible scales. Beauty is not your vanity — it is your compass.',
  Scorpio: 'You see beneath every surface. What others fear to look at, you have already memorized.',
  Sagittarius: 'You aim for the horizon and find another one behind it. Stillness has never known your name.',
  Capricorn: 'You build cathedrals in silence. The world will see your work long after it forgets your doubt.',
  Aquarius: 'You arrived from a future the rest of us haven\'t imagined yet. Belonging was never the point.',
  Pisces: 'You dissolve the boundary between dreaming and waking. The unseen world speaks to you first.',
};

// ============================================
// MOON DESCRIPTIONS — the emotional undercurrent
// ============================================
const MOON_TRAITS: Record<ZodiacSign, string> = {
  Aries: 'But beneath that — a heart that needs to be first, needs to matter, needs to burn.',
  Taurus: 'But beneath that — a soul that craves stillness, softness, the weight of something real.',
  Gemini: 'But beneath that — a restless need to be understood, even when you can\'t sit still long enough to explain.',
  Cancer: 'But beneath that — tides of feeling so deep they frighten even you.',
  Leo: 'But beneath that — a child who still needs to be seen, truly seen, by the people who matter.',
  Virgo: 'But beneath that — a quiet ache to be useful, to be enough, to get it right.',
  Libra: 'But beneath that — a longing for peace so profound you\'ll reshape yourself to keep it.',
  Scorpio: 'But beneath that — an intensity that could swallow the sky. You feel everything, and you forget nothing.',
  Sagittarius: 'But beneath that — a wild heart that runs from what it can\'t outgrow.',
  Capricorn: 'But beneath that — a loneliness you\'ve learned to call discipline.',
  Aquarius: 'But beneath that — a mind that processes feeling through distance, watching its own heart like a stranger.',
  Pisces: 'But beneath that — an empathy so vast it drowns you in other people\'s weather.',
};

export function FirstGlimpse({ sunSign, moonSign, risingSign, onEnter }: FirstGlimpseProps) {
  const personality = useMemo(() => {
    const sun = SUN_TRAITS[sunSign];
    const moon = MOON_TRAITS[moonSign];
    return `${sun}\n\n${moon}`;
  }, [sunSign, moonSign]);

  const handleEnter = () => {
    playClick();
    onEnter();
  };

  return (
    <div className="first-glimpse">
      <div className="first-glimpse__content">
        {/* Eye closed — stays closed until user summons on main screen */}
        <div className="first-glimpse__eye">
          <SeerEye state="closed" />
        </div>

        {/* Trinity: Sun · Moon · Rising */}
        <div className="first-glimpse__trinity">
          <span className="first-glimpse__sign">
            <span className="first-glimpse__sign-symbol">{ZODIAC_SYMBOLS[sunSign]}</span>
            <span className="first-glimpse__sign-label">{sunSign} Sun</span>
          </span>
          <span className="first-glimpse__sign-dot">{'\u00B7'}</span>
          <span className="first-glimpse__sign">
            <span className="first-glimpse__sign-symbol">{ZODIAC_SYMBOLS[moonSign]}</span>
            <span className="first-glimpse__sign-label">{moonSign} Moon</span>
          </span>
          {risingSign && (
            <>
              <span className="first-glimpse__sign-dot">{'\u00B7'}</span>
              <span className="first-glimpse__sign">
                <span className="first-glimpse__sign-symbol">{ZODIAC_SYMBOLS[risingSign]}</span>
                <span className="first-glimpse__sign-label">{risingSign} Rising</span>
              </span>
            </>
          )}
        </div>

        {/* Personality reading */}
        <div className="first-glimpse__reading">
          {personality.split('\n\n').map((p, i) => (
            <p key={i} style={{ marginBottom: i === 0 ? '16px' : 0 }}>{p}</p>
          ))}
        </div>

        {/* Enter */}
        <button className="first-glimpse__enter" onClick={handleEnter}>
          Enter
        </button>
      </div>
    </div>
  );
}
