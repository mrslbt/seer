import { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/I18nContext';
import './SeerIntro.css';

interface SeerIntroProps {
  onComplete: () => void;
}

const SCREEN_COUNT = 3;

export function SeerIntro({ onComplete }: SeerIntroProps) {
  const { t } = useI18n();
  const [activeScreen, setActiveScreen] = useState(0);
  const [exitingScreen, setExitingScreen] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const rippleId = useRef(0);

  const advance = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
    // Spawn tap ripple at click/touch position
    if (e && 'clientX' in e) {
      const id = ++rippleId.current;
      setRipple({ x: e.clientX, y: e.clientY, id });
      setTimeout(() => setRipple(prev => prev?.id === id ? null : prev), 600);
    }

    if (activeScreen >= SCREEN_COUNT - 1) {
      onComplete();
      return;
    }

    setExitingScreen(activeScreen);
    const next = activeScreen + 1;
    setActiveScreen(next);

    // Clear exiting state after transition
    setTimeout(() => setExitingScreen(null), 500);
  }, [activeScreen, onComplete]);

  // Listen for Enter / Space key to advance
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advance]);

  const getScreenClass = (index: number) => {
    if (index === activeScreen) return 'seer-intro__screen seer-intro__screen--active';
    if (index === exitingScreen) return 'seer-intro__screen seer-intro__screen--exiting';
    return 'seer-intro__screen';
  };

  return (
    <div className="seer-intro" onClick={(e) => advance(e)}>
      {/* Screen 1: "The stars have been waiting" */}
      <div className={getScreenClass(0)}>
        <p className="seer-intro__text">{t('intro.line1')}</p>
      </div>

      {/* Screen 2: Three lines staggered */}
      <div className={getScreenClass(1)}>
        <div>
          <span className="seer-intro__text-line">{t('intro.line2')}</span>
          <span className="seer-intro__text-line">{t('intro.line3')}</span>
          <span className="seer-intro__text-line">{t('intro.line4')}</span>
        </div>
      </div>

      {/* Screen 3: Before the form */}
      <div className={getScreenClass(2)}>
        <p className="seer-intro__text">{t('intro.line5')}</p>
      </div>

      {/* Progress dots */}
      <div className="seer-intro__progress">
        {Array.from({ length: SCREEN_COUNT }, (_, i) => (
          <span
            key={i}
            className={`seer-intro__dot${i === activeScreen ? ' seer-intro__dot--active' : ''}`}
          />
        ))}
      </div>

      {/* Tap hint */}
      <span className="seer-intro__hint">{t('intro.tap')}</span>

      {/* Tap ripple feedback */}
      {ripple && (
        <span
          className="seer-intro__ripple"
          style={{ left: ripple.x, top: ripple.y }}
          key={ripple.id}
        />
      )}
    </div>
  );
}
