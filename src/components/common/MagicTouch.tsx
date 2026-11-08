import React, { useEffect, useState, useCallback, useRef } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  symbol: string;
  color: string;
  size: number; // in px
  angle: number; // in radians
  speed: number;
  rotation: number;
  scale: number;
  createdAt: number;
  duration: number; // 500ms - 900ms
}

const MAGIC_SYMBOLS = ['✦', '✨', '♡', '•', '✧', '❖'];
const MAGIC_COLORS = ['#FFFFFF', '#E6C5FF', '#D8B4FE', '#C9A4E8', '#F5E9FF'];

const MAX_SIMULTANEOUS_PARTICLES = 30;

export const MagicTouch: React.FC = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  const isReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const createBurst = useCallback(
    (clientX: number, clientY: number) => {
      if (isReducedMotion) return;

      const count = Math.floor(Math.random() * 4) + 5; // 5 to 8 particles
      const newParticles: Particle[] = [];
      const now = Date.now();

      for (let i = 0; i < count; i++) {
        const symbol = MAGIC_SYMBOLS[Math.floor(Math.random() * MAGIC_SYMBOLS.length)];
        const color = MAGIC_COLORS[Math.floor(Math.random() * MAGIC_COLORS.length)];
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 35 + 15; // travel 15-50px
        const size = Math.floor(Math.random() * 8) + 12; // 12px to 20px
        const rotation = Math.random() * 90 - 45; // -45 to 45 deg
        const duration = Math.floor(Math.random() * 300) + 550; // 550ms to 850ms

        newParticles.push({
          id: `p_${now}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          x: clientX,
          y: clientY,
          symbol,
          color,
          size,
          angle,
          speed,
          rotation,
          scale: 0.6 + Math.random() * 0.6,
          createdAt: now,
          duration,
        });
      }

      setParticles((prev) => {
        const combined = [...prev, ...newParticles];
        // Enforce maximum particle count for performance
        if (combined.length > MAX_SIMULTANEOUS_PARTICLES) {
          return combined.slice(combined.length - MAX_SIMULTANEOUS_PARTICLES);
        }
        return combined;
      });
    },
    [isReducedMotion]
  );

  // Global Pointer / Touch listener
  useEffect(() => {
    if (isReducedMotion) return;

    const handlePointerDown = (e: PointerEvent) => {
      // Create magic sparkles at click/tap coordinates
      createBurst(e.clientX, e.clientY);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [createBurst, isReducedMotion]);

  // Particle cleanup animation loop
  useEffect(() => {
    if (particles.length === 0) return;

    const updateLoop = () => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.createdAt < p.duration));
      animFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [particles.length]);

  if (isReducedMotion || particles.length === 0) {
    return null;
  }

  const now = Date.now();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => {
        const elapsed = now - p.createdAt;
        const progress = Math.min(1, elapsed / p.duration); // 0.0 to 1.0

        // Motion translation
        const distance = p.speed * Math.sin(progress * (Math.PI / 2)); // Ease out
        const dx = Math.cos(p.angle) * distance;
        const dy = Math.sin(p.angle) * distance - progress * 15; // gentle upward float

        // Opacity and scale
        const opacity = 1 - Math.pow(progress, 1.5); // smooth fade out
        const currentScale = p.scale * (1 + progress * 0.4);
        const currentRotation = p.rotation + progress * 30;

        return (
          <span
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}px`,
              top: `${p.y}px`,
              transform: `translate(-50%, -50%) translate3d(${dx}px, ${dy}px, 0) rotate(${currentRotation}deg) scale(${currentScale})`,
              opacity,
              color: p.color,
              fontSize: `${p.size}px`,
              lineHeight: 1,
              textShadow: `0 0 8px ${p.color}, 0 0 14px rgba(230, 197, 255, 0.6)`,
              willChange: 'transform, opacity',
              userSelect: 'none',
            }}
            className="transition-none pointer-events-none font-sans"
          >
            {p.symbol}
          </span>
        );
      })}
    </div>
  );
};
