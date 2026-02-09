import { useState, useCallback, useEffect } from 'react';
import './SeerIntro.css';

interface SeerIntroProps {
  onComplete: () => void;
}

const SCREEN_COUNT = 3;

export function SeerIntro({ onComplete }: SeerIntroProps) {
  const [activeScreen, setActiveScreen] = useState(0);
  const [exitingScreen, setExitingScreen] = useState<number | null>(null);

  const advance = useCallback(() => {
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
    <div className="seer-intro" onClick={advance}>
      {/* Screen 1: "The stars have been waiting" */}
      <div className={getScreenClass(0)}>
        <p className="seer-intro__text">The stars have been waiting</p>
      </div>

      {/* Screen 2: Three lines staggered */}
      <div className={getScreenClass(1)}>
        <div>
          <span className="seer-intro__text-line">Your chart.</span>
          <span className="seer-intro__text-line">Your oracle.</span>
          <span className="seer-intro__text-line">Your truth.</span>
        </div>
      </div>

      {/* Screen 3: Before the form */}
      <div className={getScreenClass(2)}>
        <p className="seer-intro__text">To see, I must know when you arrived</p>
      </div>

      <span className="seer-intro__hint">tap</span>
    </div>
  );
}
