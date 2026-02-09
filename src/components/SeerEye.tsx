import { useState, useEffect, useRef, useCallback } from 'react';
import './SeerEye.css';

interface SeerEyeProps {
  state: 'closed' | 'opening' | 'open' | 'gazing' | 'revealing';
  onOpenComplete?: () => void;
  onGazeComplete?: () => void;
}

const OPEN_DURATION = 1500;
const GAZE_DURATION = 3500;
const MIN_GAZE_BEFORE_SKIP = 1500; // Must gaze at least 1.5s before tap-to-skip

// --- Blink physiology ---
// Real human blinks: close ~75-90ms, stay shut ~50-70ms, reopen ~120-170ms
// We add variance so no two blinks feel identical.
// Occasional double-blinks (~20% chance) add organic texture.
type BlinkPhase = 'none' | 'closing' | 'shut' | 'opening';

// Pupil constriction states — driven by context
type PupilState = 'normal' | 'constricted' | 'dilated' | 'focused';

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

// Generate organic iris fiber angles (non-uniform for realism)
const IRIS_FIBERS = Array.from({ length: 24 }, (_, i) => {
  const base = i * 15;
  const jitter = randomBetween(-3, 3);
  const length = randomBetween(0.7, 1);
  const opacity = randomBetween(0.04, 0.12);
  return { angle: base + jitter, length, opacity };
});

// Secondary shorter fibers for density
const IRIS_FIBERS_INNER = Array.from({ length: 16 }, (_, i) => {
  const base = i * 22.5 + 11;
  const jitter = randomBetween(-4, 4);
  const opacity = randomBetween(0.03, 0.08);
  return { angle: base + jitter, opacity };
});

export function SeerEye({ state, onOpenComplete, onGazeComplete }: SeerEyeProps) {
  const [internalState, setInternalState] = useState(state);
  const [blinkPhase, setBlinkPhase] = useState<BlinkPhase>('none');
  const [pupilState, setPupilState] = useState<PupilState>('normal');
  const [canSkipGaze, setCanSkipGaze] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkChainRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pupilTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gazeCompletedRef = useRef(false);

  // Handle tap-to-skip gazing
  const handleSkipGaze = useCallback(() => {
    if (!canSkipGaze || gazeCompletedRef.current) return;
    gazeCompletedRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onGazeComplete?.();
  }, [canSkipGaze, onGazeComplete]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (skipTimerRef.current) clearTimeout(skipTimerRef.current);

    setInternalState(state);
    setCanSkipGaze(false);
    gazeCompletedRef.current = false;

    if (state === 'opening') {
      // Pupil constricts on open (light reaction) then relaxes
      setPupilState('constricted');
      const relaxTimer = setTimeout(() => setPupilState('normal'), 800);
      blinkChainRef.current.push(relaxTimer);

      timeoutRef.current = setTimeout(() => {
        onOpenComplete?.();
      }, OPEN_DURATION);
    }

    if (state === 'gazing') {
      // Pupil focuses (slightly constricted) while gazing
      setPupilState('focused');

      // Allow skip after minimum gaze time
      skipTimerRef.current = setTimeout(() => {
        setCanSkipGaze(true);
      }, MIN_GAZE_BEFORE_SKIP);

      timeoutRef.current = setTimeout(() => {
        if (!gazeCompletedRef.current) {
          gazeCompletedRef.current = true;
          onGazeComplete?.();
        }
      }, GAZE_DURATION);
    }

    if (state === 'revealing') {
      // Pupil dilates on reveal (surprise/insight reaction)
      setPupilState('dilated');
      const normalizeTimer = setTimeout(() => setPupilState('normal'), 2000);
      blinkChainRef.current.push(normalizeTimer);
    }

    if (state === 'closed') {
      setPupilState('normal');
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (skipTimerRef.current) clearTimeout(skipTimerRef.current);
    };
  }, [state, onOpenComplete, onGazeComplete]);

  // Random pupil micro-fluctuations when open (hippus)
  useEffect(() => {
    const canFluctuate = internalState === 'open' || internalState === 'revealing';
    if (!canFluctuate) return;

    function scheduleFluctuation() {
      const delay = randomBetween(4000, 9000);
      pupilTimerRef.current = setTimeout(() => {
        // Brief constriction (~15% of the time)
        if (Math.random() < 0.15) {
          setPupilState('constricted');
          const restoreTimer = setTimeout(() => {
            setPupilState('normal');
            scheduleFluctuation();
          }, randomBetween(300, 600));
          blinkChainRef.current.push(restoreTimer);
        } else {
          scheduleFluctuation();
        }
      }, delay);
      blinkChainRef.current.push(pupilTimerRef.current);
    }

    const initDelay = randomBetween(3000, 6000);
    const initTimer = setTimeout(scheduleFluctuation, initDelay);
    blinkChainRef.current.push(initTimer);

    return () => {
      if (pupilTimerRef.current) clearTimeout(pupilTimerRef.current);
    };
  }, [internalState]);

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

  // Pupil radius based on state
  const getPupilRadius = (): number => {
    switch (pupilState) {
      case 'constricted': return 7;
      case 'focused': return 9;
      case 'dilated': return 14;
      default: return 11;
    }
  };

  // Build CSS class for blink phase
  const blinkClass = blinkPhase !== 'none' ? `seer-eye--blink-${blinkPhase}` : '';
  const pupilClass = `eye-pupil--${pupilState}`;

  return (
    <div
      className={`seer-eye-container seer-eye--${internalState} ${blinkClass}`}
      onClick={internalState === 'gazing' ? handleSkipGaze : undefined}
      style={internalState === 'gazing' && canSkipGaze ? { cursor: 'pointer' } : undefined}
    >
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

            {/* Iris gradient — more layered for depth */}
            <radialGradient id="irisGradient" cx="0.4" cy="0.38">
              <stop offset="0%" stopColor="#D4B456" />
              <stop offset="20%" stopColor="#C9A84C" />
              <stop offset="40%" stopColor="#A08338" />
              <stop offset="65%" stopColor="#6B5824" />
              <stop offset="85%" stopColor="#3D3215" />
              <stop offset="100%" stopColor="#2A2210" />
            </radialGradient>

            {/* Iris detail pattern — collarette ring and crypts */}
            <radialGradient id="irisDetail" cx="0.5" cy="0.5">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="38%" stopColor="transparent" />
              <stop offset="39%" stopColor="rgba(201, 168, 76, 0.2)" />
              <stop offset="41%" stopColor="rgba(201, 168, 76, 0.08)" />
              <stop offset="42%" stopColor="transparent" />
              <stop offset="58%" stopColor="transparent" />
              <stop offset="59%" stopColor="rgba(201, 168, 76, 0.12)" />
              <stop offset="60%" stopColor="transparent" />
              <stop offset="70%" stopColor="transparent" />
              <stop offset="71%" stopColor="rgba(201, 168, 76, 0.1)" />
              <stop offset="72%" stopColor="transparent" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>

            {/* Sclera gradient — slight warmth near iris, darker at edges */}
            <radialGradient id="scleraGradient" cx="0.5" cy="0.5">
              <stop offset="0%" stopColor="#121210" />
              <stop offset="40%" stopColor="#0c0c0b" />
              <stop offset="75%" stopColor="#0a0a09" />
              <stop offset="100%" stopColor="#060606" />
            </radialGradient>

            {/* Pupil gradient — not flat black, has depth */}
            <radialGradient id="pupilGradient" cx="0.45" cy="0.42">
              <stop offset="0%" stopColor="#050505" />
              <stop offset="60%" stopColor="#020202" />
              <stop offset="100%" stopColor="#000000" />
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

            {/* Soft glow for reveal glint */}
            <filter id="glintGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background sclera — subtle gradient, not flat */}
          <ellipse
            cx="80" cy="80" rx="70" ry="58"
            fill="url(#scleraGradient)"
            className="eye-sclera"
          />

          {/* Sclera vein details — faint blood vessel hints */}
          <g className="sclera-veins" opacity="0">
            {/* Left side veins */}
            <path d="M 22,72 Q 35,70 45,74 Q 50,76 54,78" fill="none" stroke="rgba(120,40,40,0.15)" strokeWidth="0.4" />
            <path d="M 18,82 Q 30,80 42,81 Q 48,82 53,80" fill="none" stroke="rgba(120,40,40,0.12)" strokeWidth="0.3" />
            <path d="M 25,90 Q 38,88 48,85" fill="none" stroke="rgba(120,40,40,0.1)" strokeWidth="0.3" />
            {/* Right side veins */}
            <path d="M 138,72 Q 125,70 115,74 Q 110,76 106,78" fill="none" stroke="rgba(120,40,40,0.15)" strokeWidth="0.4" />
            <path d="M 142,82 Q 130,80 118,81 Q 112,82 107,80" fill="none" stroke="rgba(120,40,40,0.12)" strokeWidth="0.3" />
            <path d="M 135,90 Q 122,88 112,85" fill="none" stroke="rgba(120,40,40,0.1)" strokeWidth="0.3" />
          </g>

          {/* Iris group */}
          <g className={`iris-group ${isGazing ? 'iris-group--gazing' : ''} ${isRevealing ? 'iris-group--revealing' : ''} ${isBlinkActive ? 'iris-group--blink' : ''}`}>

            {/* Limbal ring — dark border around iris (anatomical detail) */}
            <circle
              cx="80" cy="80" r="27"
              fill="none"
              stroke="rgba(20, 16, 8, 0.8)"
              strokeWidth="1.5"
              className="limbal-ring"
            />

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

            {/* Iris texture rings (collarette + crypts) */}
            <circle
              cx="80" cy="80" r="26"
              fill="url(#irisDetail)"
              className="iris-texture"
            />

            {/* Iris fiber lines — organic, non-uniform */}
            {IRIS_FIBERS.map((fiber, i) => {
              const rad = fiber.angle * Math.PI / 180;
              const innerR = 12;
              const outerR = 25 * fiber.length;
              return (
                <line
                  key={`f-${i}`}
                  x1={80 + Math.cos(rad) * innerR}
                  y1={80 + Math.sin(rad) * innerR}
                  x2={80 + Math.cos(rad) * outerR}
                  y2={80 + Math.sin(rad) * outerR}
                  stroke={`rgba(201, 168, 76, ${fiber.opacity})`}
                  strokeWidth="0.5"
                  className="iris-fiber"
                />
              );
            })}

            {/* Inner fibers — shorter, denser, closer to pupil */}
            {IRIS_FIBERS_INNER.map((fiber, i) => {
              const rad = fiber.angle * Math.PI / 180;
              return (
                <line
                  key={`fi-${i}`}
                  x1={80 + Math.cos(rad) * 8}
                  y1={80 + Math.sin(rad) * 8}
                  x2={80 + Math.cos(rad) * 15}
                  y2={80 + Math.sin(rad) * 15}
                  stroke={`rgba(201, 168, 76, ${fiber.opacity})`}
                  strokeWidth="0.4"
                  className="iris-fiber-inner"
                />
              );
            })}

            {/* Iris collarette — the visible ring between pupil zone and ciliary zone */}
            <circle
              cx="80" cy="80" r="17"
              fill="none"
              stroke="rgba(201, 168, 76, 0.06)"
              strokeWidth="0.8"
              className="iris-collarette"
            />

            {/* Pupil — animated radius for constriction/dilation */}
            <circle
              cx="80" cy="80"
              r={getPupilRadius()}
              fill="url(#pupilGradient)"
              className={`eye-pupil ${isGazing ? 'eye-pupil--gazing' : ''} ${pupilClass}`}
            />

            {/* Pupil depth ring — follows pupil size */}
            <circle
              cx="80" cy="80"
              r={getPupilRadius()}
              fill="none"
              stroke="rgba(42, 34, 16, 0.5)"
              strokeWidth="1.2"
              className="pupil-depth-ring"
            />

            {/* Inner pupil edge — subtle brown ring inside pupil border */}
            <circle
              cx="80" cy="80"
              r={getPupilRadius() - 0.8}
              fill="none"
              stroke="rgba(80, 60, 20, 0.2)"
              strokeWidth="0.6"
              className="pupil-inner-edge"
            />

            {/* Light reflections */}
            <circle
              cx="87" cy="73" r="3"
              fill="rgba(255,255,255,0.55)"
              className="eye-glint-main"
              filter={isRevealing ? 'url(#glintGlow)' : undefined}
            />
            <circle cx="74" cy="86" r="1.5" fill="rgba(255,255,255,0.2)" className="eye-glint-secondary" />

            {/* Tertiary micro-glint — very subtle, adds life */}
            <circle cx="83" cy="85" r="0.8" fill="rgba(255,255,255,0.08)" className="eye-glint-tertiary" />
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

          {/* Eyelid crease line — subtle fold above top lid */}
          <path
            className="lid-crease"
            d={isOpen || isOpening
              ? "M 8,80 Q 40,10 80,4 Q 120,10 152,80"
              : "M 8,80 Q 40,76 80,75 Q 120,76 152,80"
            }
            fill="none"
            stroke="rgba(201, 168, 76, 0.06)"
            strokeWidth="0.5"
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

          {/* Waterline — the wet edge inside the lower lid */}
          <path
            className="waterline"
            d={getBottomLashPath()}
            fill="none"
            stroke="rgba(201, 168, 76, 0.04)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {internalState === 'gazing' && (
        <div className="gaze-status">
          {canSkipGaze ? (
            <span className="gaze-skip-hint">tap to reveal</span>
          ) : (
            <span className="gaze-dots">
              <span>.</span><span>.</span><span>.</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
