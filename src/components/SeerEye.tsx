import { useState, useEffect, useRef } from 'react';
import './SeerEye.css';

interface SeerEyeProps {
  state: 'closed' | 'opening' | 'open' | 'gazing' | 'revealing';
  onOpenComplete?: () => void;
  onGazeComplete?: () => void;
}

const OPEN_DURATION = 1500;
const GAZE_DURATION = 3500;

// Blink timing: random interval between blinks
const BLINK_MIN_INTERVAL = 2500;
const BLINK_MAX_INTERVAL = 6000;
const BLINK_DURATION = 180;

export function SeerEye({ state, onOpenComplete, onGazeComplete }: SeerEyeProps) {
  const [internalState, setInternalState] = useState(state);
  const [isBlinking, setIsBlinking] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Random blinking when eye is open
  useEffect(() => {
    const canBlink = internalState === 'open' || internalState === 'revealing';
    if (!canBlink) {
      setIsBlinking(false);
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
      return;
    }

    function scheduleBlink() {
      const delay = BLINK_MIN_INTERVAL + Math.random() * (BLINK_MAX_INTERVAL - BLINK_MIN_INTERVAL);
      blinkTimeoutRef.current = setTimeout(() => {
        setIsBlinking(true);
        // Re-open after blink duration
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, BLINK_DURATION);
      }, delay);
    }

    // Initial delay before first blink (longer so eye settles first)
    const initialDelay = 1500 + Math.random() * 2000;
    blinkTimeoutRef.current = setTimeout(() => {
      scheduleBlink();
    }, initialDelay);

    return () => {
      if (blinkTimeoutRef.current) clearTimeout(blinkTimeoutRef.current);
    };
  }, [internalState]);

  const isOpen = internalState === 'open' || internalState === 'gazing' || internalState === 'revealing';
  const isOpening = internalState === 'opening';
  const isGazing = internalState === 'gazing';
  const isRevealing = internalState === 'revealing';

  // Eyelid path: when open, lids recede to thin curves at top/bottom
  // When closed, both lids meet at the center horizontal line
  const topLidClosed = "M 0,80 Q 40,80 80,80 Q 120,80 160,80 L 160,0 L 0,0 Z";
  const topLidOpen = "M 0,80 Q 40,20 80,12 Q 120,20 160,80 L 160,0 L 0,0 Z";
  // Blink: lids nearly closed but not fully — a quick natural blink
  const topLidBlink = "M 0,80 Q 40,72 80,70 Q 120,72 160,80 L 160,0 L 0,0 Z";

  const bottomLidClosed = "M 0,80 Q 40,80 80,80 Q 120,80 160,80 L 160,160 L 0,160 Z";
  const bottomLidOpen = "M 0,80 Q 40,140 80,148 Q 120,140 160,80 L 160,160 L 0,160 Z";
  const bottomLidBlink = "M 0,80 Q 40,88 80,90 Q 120,88 160,80 L 160,160 L 0,160 Z";

  // Determine which lid paths to use
  const getTopLidPath = () => {
    if (isBlinking) return topLidBlink;
    if (isOpen || isOpening) return topLidOpen;
    return topLidClosed;
  };
  const getBottomLidPath = () => {
    if (isBlinking) return bottomLidBlink;
    if (isOpen || isOpening) return bottomLidOpen;
    return bottomLidClosed;
  };
  const getTopLashPath = () => {
    if (isBlinking) return "M 0,80 Q 40,72 80,70 Q 120,72 160,80";
    if (isOpen || isOpening) return "M 0,80 Q 40,20 80,12 Q 120,20 160,80";
    return "M 0,80 Q 40,80 80,80 Q 120,80 160,80";
  };
  const getBottomLashPath = () => {
    if (isBlinking) return "M 0,80 Q 40,88 80,90 Q 120,88 160,80";
    if (isOpen || isOpening) return "M 0,80 Q 40,140 80,148 Q 120,140 160,80";
    return "M 0,80 Q 40,80 80,80 Q 120,80 160,80";
  };

  return (
    <div className={`seer-eye-container seer-eye--${internalState} ${isBlinking ? 'seer-eye--blinking' : ''}`}>
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
                d={isBlinking ? "M 0,80 Q 40,72 80,70 Q 120,72 160,80" : (isOpen || isOpening ? "M 0,80 Q 40,20 80,12 Q 120,20 160,80" : "M 0,80 Q 40,80 80,80 Q 120,80 160,80")}
              />
              <rect x="0" y="80" width="160" height="80" />
            </clipPath>
            <clipPath id="eyeOpeningBottom">
              <path
                className="eye-opening-clip-bottom"
                d={isBlinking ? "M 0,80 Q 40,88 80,90 Q 120,88 160,80" : (isOpen || isOpening ? "M 0,80 Q 40,140 80,148 Q 120,140 160,80" : "M 0,80 Q 40,80 80,80 Q 120,80 160,80")}
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
          <g className={`iris-group ${isGazing ? 'iris-group--gazing' : ''} ${isRevealing ? 'iris-group--revealing' : ''}`}>
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
