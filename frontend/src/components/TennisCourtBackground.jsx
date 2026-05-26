import { useState, useRef, useCallback } from 'react';

// Deterministic pseudo-random generator to satisfy react-hooks/purity rules
const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Subtle sparkling stadium lights under the night sky
const COURT_SPARKS = Array.from({ length: 30 }).map((_, i) => {
  const top = `${pseudoRandom(i * 1.5) * 65}%`;
  const left = `${pseudoRandom(i * 3.7) * 100}%`;
  const size = `${pseudoRandom(i * 7.9) * 3 + 2}px`;
  const delay = `${pseudoRandom(i * 11.2) * 4}s`;
  const duration = `${pseudoRandom(i * 15.4) * 3 + 2}s`;
  return { id: i, top, left, size, delay, duration };
});

const TennisBallIcon = () => (
  <svg viewBox="0 0 50 50" style={{ width: '100%', height: '100%' }} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Shadow */}
    <circle cx="26" cy="26" r="22" fill="rgba(0, 0, 0, 0.4)" filter="blur(2px)" />
    {/* Ball body */}
    <circle cx="25" cy="25" r="22" fill="var(--secondary)" />
    {/* Seams (curved white paths matching real tennis ball pattern) */}
    <path d="M 12 12 A 17.5 17.5 0 0 0 38 38" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M 12 38 A 17.5 17.5 0 0 1 38 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    {/* Inner shine */}
    <circle cx="25" cy="25" r="22" fill="rgba(255, 255, 255, 0.1)" />
  </svg>
);

/**
 * Draggable Tennis Ball Component.
 * Unified Pointer Events to support Mouse and Touch.
 */
function DraggableTennisBall({ className, targetRef, onAbsorb, onBoost }) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState(null); // { x, y } viewport coordinates
  const [returning, setReturning] = useState(false);
  const [absorbed, setAbsorbed] = useState(false);
  const [boosted, setBoosted] = useState(false);
  const [trails, setTrails] = useState([]); // [{ id, x, y }] particle trails
  const ballRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const startTimeRef = useRef(0);
  const startPosRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e) => {
    if (absorbed) return;
    e.preventDefault();
    e.stopPropagation();

    startTimeRef.current = Date.now();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    const el = ballRef.current;
    if (!el) return;

    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('setPointerCapture failed', err);
    }

    const rect = el.getBoundingClientRect();
    offsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    setPos({ x: rect.left, y: rect.top });
    setDragging(true);
    setReturning(false);
    setTrails([]);
  }, [absorbed]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || absorbed) return;
    e.preventDefault();

    const newX = e.clientX - offsetRef.current.x;
    const newY = e.clientY - offsetRef.current.y;
    setPos({ x: newX, y: newY });

    const centerX = newX + 30; // Center offset adjusted for 60px ball hit area
    const centerY = newY + 30;
    
    setTrails((prev) => [
      ...prev.slice(-8), 
      { id: Date.now() + Math.random(), x: centerX, y: centerY }
    ]);

    if (targetRef && targetRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const dx = centerX - targetCenterX;
      const dy = centerY - targetCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Hit success check (approaching net target)
      if (distance < 65) {
        setDragging(false);
        setAbsorbed(true);

        try {
          ballRef.current.releasePointerCapture(e.pointerId);
        } catch (err) {}

        const targetBallX = targetCenterX - 30;
        const targetBallY = targetCenterY - 30;
        setPos({ x: targetBallX, y: targetBallY });

        if (onAbsorb) {
          onAbsorb();
        }

        setTimeout(() => {
          setPos(null);
          setAbsorbed(false);
          setTrails([]);
        }, 1500);
      }
    }
  }, [dragging, absorbed, targetRef, onAbsorb]);

  const handlePointerUp = useCallback((e) => {
    if (!dragging || absorbed) return;
    
    try {
      ballRef.current.releasePointerCapture(e.pointerId);
    } catch (err) {}

    setDragging(false);

    const duration = Date.now() - startTimeRef.current;
    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (duration < 280 && distance < 12) {
      // Tap detected -> Activate Super Smash / Power Shot!
      setBoosted(true);
      setPos(null); // Release drag position to let CSS warp speed animation play instantly

      const el = ballRef.current;
      if (el && onBoost) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        onBoost(centerX, centerY);
      }

      // Boost lasts 6 seconds
      setTimeout(() => {
        setBoosted(false);
      }, 6000);

    } else {
      setReturning(true);
      setTimeout(() => {
        setPos(null);
        setReturning(false);
        setTrails([]);
      }, 600);
    }
  }, [dragging, absorbed, onBoost]);

  const style = {};
  if (absorbed && pos) {
    style.position = 'fixed';
    style.left = `${pos.x}px`;
    style.top = `${pos.y}px`;
    style.animation = 'none';
    style.zIndex = 100;
    style.transform = 'scale(0) rotate(720deg)';
    style.opacity = 0;
    style.transition = 'transform 1.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-out, left 1.3s cubic-bezier(0.25, 1, 0.5, 1), top 1.3s cubic-bezier(0.25, 1, 0.5, 1)';
  } else if (dragging && pos) {
    style.position = 'fixed';
    style.left = `${pos.x}px`;
    style.top = `${pos.y}px`;
    style.animation = 'none';
    style.zIndex = 100;
  } else if (returning && pos) {
    style.position = 'fixed';
    style.left = `${pos.x}px`;
    style.top = `${pos.y}px`;
    style.animation = 'none';
    style.zIndex = 100;
    style.transform = 'scale(0.3) rotate(360deg)';
    style.opacity = 0;
    style.transition = 'transform 0.6s ease-in, opacity 0.6s ease-in';
  }

  return (
    <>
      {/* High-Velocity Ball Trails */}
      {trails.map((particle) => (
        <div
          key={particle.id}
          className="ball-trail-particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${Math.random() * 8 + 6}px`,
            height: `${Math.random() * 8 + 6}px`,
          }}
        />
      ))}

      <div
        ref={ballRef}
        className={`tennis-ball-interactive ${className} ${dragging ? 'dragging' : ''} ${boosted ? 'boosted' : ''}`}
        style={style}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <TennisBallIcon />
      </div>
    </>
  );
}

export default function TennisCourtBackground() {
  const targetRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [pulses, setPulses] = useState([]);
  const [clicks, setClicks] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const clickTimeoutRef = useRef(null);

  const handleAbsorb = useCallback(() => {
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }

    const tennisToasts = [
      "¡Ace Perfecto! 🎾⚡",
      "¡Saque a la T! ☄️",
      "¡Punto de Quiebre! 🏆",
      "¡Smash Ganador! 🔥",
      "¡Gran Match Point! 🎾",
      "¡Pelota Nueva en Juego! 📦",
      "¡Derecha Paralela Imbatible! 🚀",
      "¡Ventaja para el Profe! 👨‍🏫"
    ];
    const text = tennisToasts[Math.floor(Math.random() * tennisToasts.length)];
    const id = Date.now() + Math.random();

    setToasts((prev) => [...prev, { id, text, x, y }]);
    setPulses((prev) => [...prev, { id, x, y }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1600);

    setTimeout(() => {
      setPulses((prev) => prev.filter((p) => p.id !== id));
    }, 1200);
  }, []);

  const handleBoost = useCallback((x, y) => {
    if (navigator.vibrate) {
      navigator.vibrate([40]);
    }

    const tennisEmoji = [
      "🎾", "🎾✨", "🏆", "🏆⚡", "🥇", "🔥🎾", "🚀", "💥", "☄️🎾", "💪🎾"
    ];
    const text = tennisEmoji[Math.floor(Math.random() * tennisEmoji.length)];
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, x, y }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
  }, []);

  const handleCourtClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setClicks((prev) => {
      const next = prev + 1;
      
      // Proximity warning vibration from 6 clicks upwards (gets more intense!)
      if (next >= 6 && next < 10) {
        if (navigator.vibrate) {
          navigator.vibrate(30 + (next - 6) * 15);
        }
      }

      if (next >= 10) {
        // Trigger Sports Easter Egg Championship Celebration!
        setShowCelebration(true);

        // Haptic huzzah cheering haptic pattern
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 150, 50, 500]);
        }

        // Hide it after 3.5 seconds
        setTimeout(() => {
          setShowCelebration(false);
        }, 3500);

        return 0; // Reset clicks
      }

      return next;
    });

    // Reset click count after 3 seconds of inactivity
    clickTimeoutRef.current = setTimeout(() => {
      setClicks(0);
    }, 3000);
  }, []);

  return (
    <>
      {/* Background Starry & Tennis Court Layer (z-index: 0) */}
      <div className="tennis-bg-container">
        {/* Twinkling Stadium Glare Sparks */}
        {COURT_SPARKS.map((spark) => (
          <div
            key={spark.id}
            className="court-spark"
            style={{
              top: spark.top,
              left: spark.left,
              width: spark.size,
              height: spark.size,
              animationDelay: spark.delay,
              animationDuration: spark.duration,
            }}
          />
        ))}

        {/* Stadium Lights Silhouette Layer */}
        <div className="stadium-lights-left" />
        <div className="stadium-lights-right" />

        {/* Tennis Court SVG at the bottom */}
        <div className="tennis-court-wrapper">
          <svg viewBox="0 0 1000 400" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <defs>
              {/* Grand Slam Navy Blue Court Gradients */}
              <linearGradient id="outerCourtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a0f1d" />
                <stop offset="100%" stopColor="#060912" />
              </linearGradient>
              <linearGradient id="innerCourtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="targetGlowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
              <filter id="targetGlow">
                <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Glowing target field */}
            <circle cx="500" cy="200" r="180" fill="url(#targetGlowGrad)" />

            {/* Tennis Court Perspective Drawing */}
            {/* Outer Alley/Sideline Polygon */}
            <polygon
              points="150,400 350,150 650,150 850,400"
              fill="url(#innerCourtGrad)"
              stroke="#ffffff"
              strokeWidth="2.5"
              filter="url(#lineGlow)"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={handleCourtClick}
            />

            {/* Inner Singles Court Lines */}
            <polygon
              points="220,400 390,150 610,150 780,400"
              fill="none"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="1.5"
              style={{ pointerEvents: 'none' }}
            />

            {/* Center Service Line */}
            <line
              x1="500" y1="150" x2="500" y2="400"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1.5"
              style={{ pointerEvents: 'none' }}
            />

            {/* Service boxes crossline */}
            <line
              x1="262.5" y1="275" x2="737.5" y2="275"
              stroke="rgba(255, 255, 255, 0.6)"
              strokeWidth="1.5"
              style={{ pointerEvents: 'none' }}
            />

            {/* Solid base */}
            <rect x="-50" y="398" width="1100" height="10" fill="#060912" />

            {/* Tennis Net drawn as a polygon across the center (at y = 200) */}
            {/* Net Posts */}
            <line x1="300" y1="230" x2="300" y2="185" stroke="#94a3b8" strokeWidth="6" />
            <line x1="700" y1="230" x2="700" y2="185" stroke="#94a3b8" strokeWidth="6" />
            
            {/* Net body (grid patterned mesh) */}
            <polygon
              points="300,190 700,190 700,230 300,230"
              fill="rgba(15, 23, 42, 0.85)"
              stroke="#64748b"
              strokeWidth="1"
            />
            {/* White strap at the top of the net */}
            <line x1="300" y1="190" x2="700" y2="190" stroke="#f8fafc" strokeWidth="4.5" />

            {/* Pulse target zone on center of the court */}
            <circle
              ref={targetRef}
              cx="500"
              cy="210"
              r="22"
              fill="var(--secondary)"
              filter="url(#targetGlow)"
              opacity="0.8"
              className="target-pulse"
            />
            <circle cx="500" cy="210" r="8" fill="#ffffff" opacity="0.95" />
          </svg>
        </div>
      </div>

      {/* Background Interactive Layer for Tennis Balls (z-index: 0) */}
      <div className="tennis-balls-interactive-container">
        {/* Render court shockwaves globally in background layer */}
        {pulses.map((p) => (
          <div
            key={p.id}
            className="court-shockwave"
            style={{ left: `${p.x}px`, top: `${p.y}px` }}
          />
        ))}

        {/* Draggable Tennis Balls with target ref and serving / smash callbacks */}
        <DraggableTennisBall className="ball-left-rally" targetRef={targetRef} onAbsorb={handleAbsorb} onBoost={handleBoost} />
        <DraggableTennisBall className="ball-right-rally" targetRef={targetRef} onAbsorb={handleAbsorb} onBoost={handleBoost} />
        <DraggableTennisBall className="ball-center-hover" targetRef={targetRef} onAbsorb={handleAbsorb} onBoost={handleBoost} />
      </div>

      {/* Foreground Toasts Layer for Emojis (z-index: 20) */}
      <div className="tennis-toasts-container">
        {/* Floating court service / points toasts (rendered in front of content cards) */}
        {toasts.map((t) => (
          <div key={t.id} className="court-toast" style={{ left: `${t.x}px`, top: `${t.y}px` }}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Easter Egg Championship Celebration Overlay (z-index: 10000) */}
      {showCelebration && (
        <div className="championship-celebration-overlay">
          <div className="champion-floating-icons">🏆🎾🥇</div>
          <div className="champion-text">¡¡PUNTO, SET Y PARTIDO!! 🥇🎾</div>
          <div className="champion-subtext">¡CAMPONES DEL TORNEO! 🏆🔥</div>
          {/* Raining Confetti elements generated via CSS */}
          <div className="confetti-sparks">
            {Array.from({ length: 25 }).map((_, i) => (
              <span key={i} className="confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: i % 3 === 0 ? 'var(--secondary)' : (i % 3 === 1 ? '#ffd700' : '#ffffff'),
                animationDelay: `${Math.random() * 2.5}s`,
                transform: `rotate(${Math.random() * 360}deg)`
              }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
