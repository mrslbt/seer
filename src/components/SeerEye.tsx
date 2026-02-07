import { useState, useEffect, useRef, useCallback } from 'react';
import './SeerEye.css';

interface SeerEyeProps {
  state: 'closed' | 'opening' | 'open' | 'gazing' | 'revealing';
  onOpenComplete?: () => void;
  onGazeComplete?: () => void;
}

const OPEN_DURATION = 1500;
const GAZE_DURATION = 3500;

// --- Blink physiology ---
// Real human blinks: close ~75-90ms, stay shut ~50-70ms, reopen ~120-170ms
// We add variance so no two blinks feel identical.
// Occasional double-blinks (~20% chance) add organic texture.
type BlinkPhase = 'none' | 'closing' | 'shut' | 'opening';

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function SeerEye({ state, onOpenComplete, onGazeComplete }: SeerEyeProps) {
  const [internalState, setInternalState] = useState(state);
  const [blinkPhase, setBlinkPhase] = useState<BlinkPhase>('none');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkChainRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setInternalState(state);

    if (state === 'opening') {
      timeoutRef.current = setTimeout(() => {
        onOpenComplete?.();
      }, OPEN_DURATION);
    }

    if (state === 'gazing') {
      timeoutRef.current = setTimeout(() => {
        onGazeComplete?.();
      }, GAZE_DURATION);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, onOpenComplete, onGazeComplete]);

  const clearBlinkChain = useCallback(() => {
    blinkChainRef.current.forEach(clearTimeout);
    blinkChainRef.current = [];
  }, []);

  // Execute a single blink with phased timing, returns total duration
  const executeBlink = useCallback((onComplete: () => void) => {
    const closeTime = randomBetween(70, 100);    // snap shut
    const shutTime = randomBetween(40, 80);       // held closed
    const openTime = randomBetween(130, 200);     // slower reopen

    // Phase 1: closing
    setBlinkPhase('closing');

    const t1 = setTimeout(() => {
      // Phase 2: fully shut
      setBlinkPhase('shut');

      const t2 = setTimeout(() => {
        // Phase 3: reopening
        setBlinkPhase('opening');

        const t3 = setTimeout(() => {
          // Done
          setBlinkPhase('none');
          onComplete();
        }, openTime);
        blinkChainRef.current.push(t3);
      }, shutTime);
      blinkChainRef.current.push(t2);
    }, closeTime);
    blinkChainRef.current.push(t1);
  }, []);

  // Random blinking when eye is open or revealing
  useEffect(() => {
    const canBlink = internalState === 'open' || internalState === 'revealing';
    if (!canBlink) {
      setBlinkPhase('none');
      clearBlinkChain();
      return;
    }

    function scheduleBlink() {
      // Interval: 2–7s, weighted toward 3–5s (human average ~3-4s)
      const baseDelay = randomBetween(2000, 7000);
      const t = setTimeout(() => {
        // ~20% chance of a double-blink
        const isDouble = Math.random() < 0.2;
        executeBlink(() => {
          if (isDouble) {
            // Second blink comes faster, shorter pause
            const gapDelay = randomBetween(100, 200);
            const tGap = setTimeout(() => {
              executeBlink(() => {
                scheduleBlink();
              });
            }, gapDelay);
            blinkChainRef.current.push(tGap);
          } else {
            scheduleBlink();
          }
        });
      }, baseDelay);
      blinkChainRef.current.push(t);
    }

    // Initial delay — let the eye settle before first blink
    const initialDelay = randomBetween(1800, 3500);
    const tInit = setTimeout(() => {
      scheduleBlink();
    }, initialDelay);
    blinkChainRef.current.push(tInit);

    return () => {
      clearBlinkChain();
    };
  }, [internalState, executeBlink, clearBlinkChain]);

  const isOpen = internalState === 'open' || internalState === 'gazing' || internalState === 'revealing';
  const isOpening = internalState === 'opening';
  const isGazing = internalState === 'gazing';
  const isRevealing = internalState === 'revealing';
  const isBlinkActive = blinkPhase !== 'none';

  // --- Eyelid paths ---
  // Open: lids recede to thin curves at top/bottom
  // Closed: both lids meet at center horizontal
  const topLidClosed = "M 0,80 Q 40,80 80,80 Q 120,80 160,80 L 160,0 L 0,0 Z";
  const topLidOpen = "M 0,80 Q 40,20 80,12 Q 120,20 160,80 L 160,0 L 0,0 Z";

  const bottomLidClosed = "M 0,80 Q 40,80 80,80 Q 120,80 160,80 L 160,160 L 0,160 Z";
  const bottomLidOpen = "M 0,80 Q 40,140 80,148 Q 120,140 160,80 L 160,160 L 0,160 Z";

  // Blink positions — closing phase goes nearly shut, shut phase fully meets
  const topLidClosing = "M 0,80 Q 40,68 80,64 Q 120,68 160,80 L 160,0 L 0,0 Z";
  const topLidShut = "M 0,80 Q 40,78 80,77 Q 120,78 160,80 L 160,0 L 0,0 Z";

  const bottomLidClosing = "M 0,80 Q 40,92 80,96 Q 120,92 160,80 L 160,160 L 0,160 Z";
  const bottomLidShut = "M 0,80 Q 40,82 80,83 Q 120,82 160,80 L 160,160 L 0,160 Z";

  // Determine which lid paths to use based on blink phase
  const getTopLidPath = () => {
    switch (blinkPhase) {
      case 'closing': return topLidClosing;
      case 'shut': return topLidShut;
      case 'opening': return topLidClosing; // reopening passes through closing position
      default: return (isOpen || isOpening) ? topLidOpen : topLidClosed;
    }
  };
  const getBottomLidPath = () => {
    switch (blinkPhase) {
      case 'closing': return bottomLidClosing;
      case 'shut': return bottomLidShut;
      case 'opening': return bottomLidClosing;
      default: return (isOpen || isOpening) ? bottomLidOpen : bottomLidClosed;
    }
  };

  // Lash lines (no fill, just the edge stroke) — same positions without L/Z
  const lashPaths = {
    topOpen: "M 0,80 Q 40,20 80,12 Q 120,20 160,80",
    topClosed: "M 0,80 Q 40,80 80,80 Q 120,80 160,80",
    topClosing: "M 0,80 Q 40,68 80,64 Q 120,68 160,80",
    topShut: "M 0,80 Q 40,78 80,77 Q 120,78 160,80",
    bottomOpen: "M 0,80 Q 40,140 80,148 Q 120,140 160,80",
    bottomClosed: "M 0,80 Q 40,80 80,80 Q 120,80 160,80",
    bottomClosing: "M 0,80 Q 40,92 80,96 Q 120,92 160,80",
    bottomShut: "M 0,80 Q 40,82 80,83 Q 120,82 160,80",
  };

  const getTopLashPath = () => {
    switch (blinkPhase) {
      case 'closing': return lashPaths.topClosing;
      case 'shut': return lashPaths.topShut;
      case 'opening': return lashPaths.topClosing;
      default: return (isOpen || isOpening) ? lashPaths.topOpen : lashPaths.topClosed;
    }
  };
  const getBottomLashPath = () => {
    switch (blinkPhase) {
      case 'closing': return lashPaths.bottomClosing;
      case 'shut': return lashPaths.bottomShut;
      case 'opening': return lashPaths.bottomClosing;
      default: return (isOpen || isOpening) ? lashPaths.bottomOpen : lashPaths.bottomClosed;
    }
  };

  // Clip paths follow the same logic
  const getClipTopPath = () => {
    switch (blinkPhase) {
      case 'closing': return lashPaths.topClosing;
      case 'shut': return lashPaths.topShut;
      case 'opening': return lashPaths.topClosing;
      default: return (isOpen || isOpening) ? lashPaths.topOpen : lashPaths.topClosed;
    }
  };
  const getClipBottomPath = () => {
    switch (blinkPhase) {
      case 'closing': return lashPaths.bottomClosing;
      case 'shut': return lashPaths.bottomShut;
      case 'opening': return lashPaths.bottomClosing;
      default: return (isOpen || isOpening) ? lashPaths.bottomOpen : lashPaths.bottomClosed;
    }
  };

  // Build CSS class for blink phase
  const blinkClass = blinkPhase !== 'none' ? `seer-eye--blink-${blinkPhase}` : '';

  return (
    <div className={`seer-eye-container seer-eye--${internalState} ${blinkClass}`}>
      <div className="seer-eye">
        <svg
          viewBox="0 0 160 160"
          className="eye-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Clip path for the visible eye area (the opening between lids) */}
            <clipPath id="eyeOpening">
              <path
                className="eye-opening-clip-top"
                d={getClipTopPath()}
              />
              <rect x="0" y="80" width="160" height="80" />
            </clipPath>
            <clipPath id="eyeOpeningBottom">
              <path
                className="eye-opening-clip-bottom"
                d={getClipBottomPath()}
              />
              <rect x="0" y="0" width="160" height="80" />
            </clipPath>

            {/* Iris gradient */}
            <radialGradient id="irisGradient" cx="0.4" cy="0.38">
              <stop offset="0%" stopColor="#C9A84C" />
              <stop offset="35%" stopColor="#A08338" />
              <stop offset="65%" stopColor="#6B5824" />
              <stop offset="100%" stopColor="#2A2210" />
            </radialGradient>

            {/* Iris detail pattern */}
            <radialGradient id="irisDetail" cx="0.5" cy="0.5">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="transparent" />
              <stop offset="41%" stopColor="rgba(201, 168, 76, 0.15)" />
              <stop offset="42%" stopColor="transparent" />
              <stop offset="70%" stopColor="transparent" />
              <stop offset="71%" stopColor="rgba(201, 168, 76, 0.1)" />
              <stop offset="72%" stopColor="transparent" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Glow filter */}
            <filter id="irisGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Subtle shadow for depth */}
            <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="shadow" />
              <feOffset dx="0" dy="2" />
              <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
              <feFlood floodColor="#000" floodOpacity="0.6" />
              <feComposite in2="SourceGraphic" operator="in" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background - the dark "white" of the eye */}
          <ellipse
            cx="80" cy="80" rx="70" ry="58"
            fill="#080808"
            className="eye-sclera"
          />

          {/* Iris group */}
          <g className={`iris-group ${isGazing ? 'iris-group--gazing' : ''} ${isRevealing ? 'iris-group--revealing' : ''} ${isBlinkActive ? 'iris-group--blink' : ''}`}>
            {/* Outer iris glow */}
            <circle
              cx="80" cy="80" r="28"
              fill="none"
              stroke="rgba(201, 168, 76, 0.12)"
              strokeWidth="6"
              className="iris-outer-glow"
            />

            {/* Main iris */}
            <circle
              cx="80" cy="80" r="26"
              fill="url(#irisGradient)"
              className="iris-main"
            />

            {/* Iris texture rings */}
            <circle
              cx="80" cy="80" r="26"
              fill="url(#irisDetail)"
              className="iris-texture"
            />

            {/* Iris fiber lines */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
              <line
                key={angle}
                x1={80 + Math.cos(angle * Math.PI / 180) * 12}
                y1={80 + Math.sin(angle * Math.PI / 180) * 12}
                x2={80 + Math.cos(angle * Math.PI / 180) * 25}
                y2={80 + Math.sin(angle * Math.PI / 180) * 25}
                stroke="rgba(201, 168, 76, 0.08)"
                strokeWidth="0.5"
              />
            ))}

            {/* Pupil */}
            <circle
              cx="80" cy="80" r="11"
              fill="#000"
              className={`eye-pupil ${isGazing ? 'eye-pupil--gazing' : ''}`}
            />

            {/* Pupil depth ring */}
            <circle
              cx="80" cy="80" r="11"
              fill="none"
              stroke="rgba(42, 34, 16, 0.6)"
              strokeWidth="1.5"
            />

            {/* Light reflections */}
            <circle cx="87" cy="73" r="3" fill="rgba(255,255,255,0.55)" className="eye-glint-main" />
            <circle cx="74" cy="86" r="1.5" fill="rgba(255,255,255,0.2)" className="eye-glint-secondary" />
          </g>

          {/* Top eyelid */}
          <path
            className="eyelid eyelid--top"
            d={getTopLidPath()}
            fill="#000"
          />

          {/* Bottom eyelid */}
          <path
            className="eyelid eyelid--bottom"
            d={getBottomLidPath()}
            fill="#000"
          />

          {/* Eyelid edge lines (lash lines) */}
          <path
            className="lash-line lash-line--top"
            d={getTopLashPath()}
            fill="none"
            stroke="rgba(201, 168, 76, 0.25)"
            strokeWidth="1"
          />
          <path
            className="lash-line lash-line--bottom"
            d={getBottomLashPath()}
            fill="none"
            stroke="rgba(201, 168, 76, 0.15)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {internalState === 'gazing' && (
        <div className="gaze-status">
          <span className="gaze-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </div>
      )}
    </div>
  );
}
