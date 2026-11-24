import React from 'react';
import { CrochetHeart3D } from '../crochet/CrochetArt';

export interface JoyBurstItem {
  id: string;
  emoji: string;
  leftPct: number;
  delayMs: number;
}

/** 3D Lluvia de Cariño: rotating knitted crochet hearts + golden particles with depth */
export const JoyBurstLayer: React.FC<{ bursts: JoyBurstItem[] }> = ({ bursts }) => {
  if (bursts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      style={{ perspective: '700px' }}
      aria-hidden="true"
    >
      {bursts.map((b, idx) => {
        const isHeart = b.emoji === '💖' || b.emoji === '❤️' || b.emoji === '💛' || b.emoji === '💕';
        return (
          <div
            key={b.id}
            style={{
              left: `${b.leftPct}%`,
              bottom: '12%',
              animationDelay: `${b.delayMs}ms`,
            }}
            className="animate-burst-rise absolute flex flex-col items-center"
          >
            {isHeart ? (
              <div className="relative">
                <CrochetHeart3D className={idx % 2 === 0 ? 'h-11 w-11' : 'h-9 w-9'} />
                <span className="absolute -right-2 -top-2 text-sm text-solar-400">✦</span>
              </div>
            ) : (
              <span className="text-3xl drop-shadow-[0_6px_10px_rgba(77,52,20,0.28)] sm:text-4xl">
                {b.emoji}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
