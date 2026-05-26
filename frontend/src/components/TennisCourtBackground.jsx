import { useState, useRef, useCallback } from 'react';

export default function TennisCourtBackground() {
  const [clicks, setClicks] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const clickTimeoutRef = useRef(null);

  const handleCourtClick = useCallback(() => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setClicks((prev) => {
      const next = prev + 1;
      
      // Proximity warning vibration from 6 clicks upwards
      if (next >= 6 && next < 10) {
        if (navigator.vibrate) {
          navigator.vibrate(30 + (next - 6) * 15);
        }
      }

      if (next >= 10) {
        // Trigger Sports Easter Egg Championship Celebration!
        setShowCelebration(true);

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
      {/* Background Tennis Court Layer (z-index: 0) */}
      <div className="tennis-bg-container">
        {/* Tennis Court SVG at the bottom */}
        <div className="tennis-court-wrapper">
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
            <defs>
              {/* Clay Orange Court Gradients */}
              <linearGradient id="outerCourtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a63e23" />
                <stop offset="100%" stopColor="#7c2e17" />
              </linearGradient>
              <linearGradient id="innerCourtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e06a4b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ac4327" stopOpacity="0.95" />
              </linearGradient>
              <filter id="lineGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Tennis Court Perspective Drawing */}
            {/* Outer Alley/Sideline Polygon (Doubles boundaries) */}
            <polygon
              points="50,580 350,120 650,120 950,580"
              fill="url(#innerCourtGrad)"
              stroke="#ffffff"
              strokeWidth="3.5"
              filter="url(#lineGlow)"
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
              onClick={handleCourtClick}
            />

            {/* Inner Singles Court Lines */}
            <polygon
              points="150,580 390,120 610,120 850,580"
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="2.2"
              style={{ pointerEvents: 'none' }}
            />

            {/* Center Service Line */}
            <line
              x1="500" y1="185" x2="500" y2="430"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />

            {/* Far Service Line */}
            <line
              x1="356" y1="185" x2="644" y2="185"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />

            {/* Near Service Line */}
            <line
              x1="228" y1="430" x2="772" y2="430"
              stroke="rgba(255, 255, 255, 0.8)"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />

            {/* Solid base */}
            <rect x="-50" y="578" width="1100" height="30" fill="#3c140a" />

            {/* Tennis Net drawn as a polygon across the center (at y = 280) */}
            {/* Net Posts */}
            <line x1="230" y1="330" x2="230" y2="265" stroke="#94a3b8" strokeWidth="8" />
            <line x1="770" y1="330" x2="770" y2="265" stroke="#94a3b8" strokeWidth="8" />
            
            {/* Net body (grid patterned mesh) */}
            <polygon
              points="230,270 770,270 770,320 230,320"
              fill="rgba(24, 15, 10, 0.9)"
              stroke="#5c2005"
              strokeWidth="1"
            />
            {/* White strap at the top of the net */}
            <line x1="230" y1="270" x2="770" y2="270" stroke="#ffffff" strokeWidth="5" />
          </svg>
        </div>
      </div>

      {/* Easter Egg Championship Celebration Overlay (z-index: 10000) */}
      {showCelebration && (
        <div className="championship-celebration-overlay">
          <div className="champion-floating-icons">🏆🎾🥇</div>
          <div className="champion-text">¡¡PUNTO, SET Y PARTIDO!! 🥇🎾</div>
          <div className="champion-subtext">¡CAMPEONES DEL TORNEO! 🏆🔥</div>
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
