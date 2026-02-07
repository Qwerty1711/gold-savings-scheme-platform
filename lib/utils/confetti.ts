'use client';

import confetti from 'canvas-confetti';

type ConfettiOptions = {
  durationMs?: number;
  particleCount?: number;
  colors?: string[];
};

const defaultColors = ['#f59e0b', '#fbbf24', '#fde68a', '#d97706', '#ef4444'];

export function fireCelebrationConfetti(options: ConfettiOptions = {}) {
  if (typeof window === 'undefined') return;

  const { durationMs = 1200, particleCount = 120, colors = defaultColors } = options;
  const end = Date.now() + durationMs;

  const frame = () => {
    confetti({
      particleCount: Math.floor(particleCount / 2),
      spread: 70,
      startVelocity: 35,
      ticks: 160,
      origin: { x: 0.1 + Math.random() * 0.8, y: 0.2 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}
