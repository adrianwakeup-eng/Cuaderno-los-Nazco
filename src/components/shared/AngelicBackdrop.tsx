import React from 'react';

const LIGHT_MOTES = [
  { left: '7%', top: '18%', size: 10, delay: '0s', duration: '9s' },
  { left: '19%', top: '64%', size: 14, delay: '1.8s', duration: '11s' },
  { left: '34%', top: '28%', size: 8, delay: '3.2s', duration: '8.5s' },
  { left: '62%', top: '16%', size: 12, delay: '0.9s', duration: '10.5s' },
  { left: '78%', top: '42%', size: 16, delay: '2.4s', duration: '12s' },
  { left: '91%', top: '24%', size: 10, delay: '4.1s', duration: '9.5s' },
  { left: '84%', top: '76%', size: 13, delay: '1.3s', duration: '11.5s' },
  { left: '48%', top: '82%', size: 9, delay: '2.8s', duration: '10s' },
];

/**
 * Ethereal angelic sunlit light-mote & pearlescent halo ambient backdrop.
 * Zero pointer interference, whisper-soft visual depth behind all textured cards.
 */
export const AngelicBackdrop: React.FC = () => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
    {/* Soft top-center heavenly sunbeam glow */}
    <div
      className="absolute -top-32 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full opacity-55 blur-3xl"
      style={{
        background:
          'radial-gradient(circle, rgba(255, 245, 214, 0.9) 0%, rgba(255, 219, 206, 0.45) 45%, transparent 72%)',
      }}
    />
    {/* Delicate drifting golden dust motes */}
    {LIGHT_MOTES.map((mote, i) => (
      <span
        key={i}
        className="animate-mote-drift absolute rounded-full"
        style={{
          left: mote.left,
          top: mote.top,
          width: `${mote.size}px`,
          height: `${mote.size}px`,
          animationDelay: mote.delay,
          animationDuration: mote.duration,
          background:
            'radial-gradient(circle, rgba(255, 250, 232, 0.95) 0%, rgba(246, 204, 152, 0.55) 55%, transparent 100%)',
          boxShadow: '0 0 14px rgba(255, 224, 174, 0.75)',
        }}
      />
    ))}
  </div>
);
