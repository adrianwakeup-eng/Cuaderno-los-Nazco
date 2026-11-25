import React, { useEffect, useRef } from 'react';

interface GiantRealisticSunflowerProps {
  className?: string;
}

/**
 * Hyperrealistic Desktop Botanical Sunflower + Oversized Serrated Veined Leaves + Live Orbiting Honeybee.
 * Composed from high-resolution macro RGBA WebP textures with independent organic wind sway
 * and a 60 FPS flight-controller honeybee that circles the flower, dips to gather pollen, and buzzes its wings.
 */
export const GiantRealisticSunflower: React.FC<GiantRealisticSunflowerProps> = ({
  className = 'w-72 2xl:w-80',
}) => {
  const beeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let rafId = 0;
    const start = performance.now();

    const animateBee = (now: number) => {
      const el = beeRef.current;
      if (el) {
        const t = (now - start) * 0.001;
        // Organic figure-8 & orbital flight path around the sunflower head and giant leaves,
        // with natural gentle slowdown when hovering near the golden pollen disk!
        const cycle = t * 0.52;
        const hoverDamp = 0.72 + 0.28 * Math.cos(cycle * 0.65);

        const x = 48 + Math.sin(cycle) * 41 * hoverDamp + Math.sin(cycle * 2.1) * 7;
        const y = 32 + Math.sin(cycle * 2.0) * 18 + Math.cos(cycle * 0.85) * 14;

        // Compute velocity vector to orient & face the honeybee naturally in flight direction
        const dt = 0.04;
        const cycleNext = (t + dt) * 0.52;
        const hoverNext = 0.72 + 0.28 * Math.cos(cycleNext * 0.65);
        const nx = 48 + Math.sin(cycleNext) * 41 * hoverNext + Math.sin(cycleNext * 2.1) * 7;
        const ny = 32 + Math.sin(cycleNext * 2.0) * 18 + Math.cos(cycleNext * 0.85) * 14;

        const vx = nx - x;
        const vy = ny - y;
        const facingLeft = vx < 0;
        const pitch = Math.max(-24, Math.min(24, Math.atan2(vy, Math.abs(vx) + 0.15) * (180 / Math.PI)));

        // Subtle 3D depth scaling + z-ordering so the bee flies BOTH in front of and behind the bloom
        const depth = Math.cos(cycle);
        const scale = 0.84 + (depth + 1) * 0.14;
        const bobY = Math.sin(t * 14.0) * 1.8;

        el.style.left = `${x}%`;
        el.style.top = `${y}%`;
        el.style.zIndex = depth > -0.25 ? '30' : '8';
        el.style.transform = `translate(-50%, -50%) translateY(${bobY.toFixed(1)}px) scaleX(${
          facingLeft ? -scale : scale
        }) scaleY(${scale}) rotate(${pitch.toFixed(1)}deg)`;
      }
      rafId = window.requestAnimationFrame(animateBee);
    };

    rafId = window.requestAnimationFrame(animateBee);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className={`sunflower-sway-root relative aspect-[320/430] select-none overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* Warm sunlit atmospheric golden aura behind the hyperrealistic blossom */}
      <div
        className="sunflower-aura-pulse pointer-events-none absolute left-1/2 top-[31%] z-0 h-[76%] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,244,168,0.52) 0%, rgba(245,158,11,0.18) 54%, rgba(245,158,11,0) 76%)',
        }}
      />

      {/* Hyperrealistic Fibrous Fuzzy Stem (with botanical trichome hairs) */}
      <img
        src="./textures/sunflower/stem.webp"
        alt=""
        draggable={false}
        className="pointer-events-none absolute bottom-0 left-[46%] z-10 h-[72%] w-auto -translate-x-1/2 object-contain drop-shadow-[0_12px_18px_rgba(18,32,8,0.42)]"
      />

      {/* GIANT Lower Left Serrated Heart Leaf (lush deep emerald foreground foliage) */}
      <img
        src="./textures/sunflower/leaf-left.webp"
        alt=""
        draggable={false}
        className="sunflower-leaf-left pointer-events-none absolute bottom-[3%] left-[-26%] z-10 w-[78%] max-w-none object-contain drop-shadow-[0_14px_18px_rgba(14,34,10,0.42)]"
        style={{ transformOrigin: '92% 52%', rotate: '-8deg' }}
      />

      {/* GIANT Upper Right Serrated Heart Leaf (sweeping generously into the frame) */}
      <img
        src="./textures/sunflower/leaf-right.webp"
        alt=""
        draggable={false}
        className="sunflower-leaf-right pointer-events-none absolute bottom-[14%] right-[-36%] z-[12] w-[86%] max-w-none object-contain drop-shadow-[0_16px_22px_rgba(14,34,10,0.45)]"
        style={{ transformOrigin: '8% 54%', rotate: '-10deg' }}
      />

      {/* Secondary Upper Left Lush Leaf peeking beneath the petals for rich botanical fullness */}
      <img
        src="./textures/sunflower/leaf-left.webp"
        alt=""
        draggable={false}
        className="sunflower-leaf-right pointer-events-none absolute bottom-[30%] left-[-18%] z-[9] w-[62%] max-w-none object-contain brightness-95 drop-shadow-[0_10px_14px_rgba(14,34,10,0.35)]"
        style={{ transformOrigin: '92% 52%', rotate: '14deg' }}
      />

      {/* Hyperrealistic Macro Sunflower Blossom Head (68 fluted petals + 740 Fibonacci pollen florets) */}
      <div
        className="sunflower-head-breathe pointer-events-none absolute left-[49%] top-[3%] z-20 w-[92%] -translate-x-1/2"
        style={{ transformOrigin: '50% 54%' }}
      >
        <img
          src="./textures/sunflower/head.webp"
          alt=""
          draggable={false}
          className="h-auto w-full object-contain drop-shadow-[0_18px_28px_rgba(38,20,4,0.44)]"
        />
      </div>

      {/* Sunlit drifting golden pollen motes */}
      <span className="sunflower-pollen-1 pointer-events-none absolute left-[24%] top-[24%] z-20 h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#FDE047]" />
      <span className="sunflower-pollen-2 pointer-events-none absolute left-[72%] top-[20%] z-20 h-1.5 w-1.5 rounded-full bg-yellow-100 shadow-[0_0_8px_#FACC15]" />
      <span className="sunflower-pollen-3 pointer-events-none absolute left-[58%] top-[10%] z-20 h-1 w-1 rounded-full bg-amber-100 shadow-[0_0_6px_#FEF08A]" />

      {/* Live Animated Hyperrealistic Honeybee (Abeja) orbiting & pollinating the sunflower */}
      <div
        ref={beeRef}
        className="pointer-events-none absolute left-1/2 top-[28%] z-30 h-14 w-14 will-change-transform"
      >
        {/* Back buzzing iridescent veined wing */}
        <img
          src="./textures/sunflower/bee-wing.webp"
          alt=""
          draggable={false}
          className="bee-wing-back pointer-events-none absolute left-[12%] top-[2%] w-[58%] opacity-80"
          style={{ transformOrigin: '84% 84%' }}
        />
        {/* Hyperrealistic fuzzy golden-black honeybee body with pollen basket */}
        <img
          src="./textures/sunflower/bee-body.webp"
          alt=""
          draggable={false}
          className="relative z-10 h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(24,14,4,0.45)]"
        />
        {/* Front buzzing iridescent veined wing */}
        <img
          src="./textures/sunflower/bee-wing.webp"
          alt=""
          draggable={false}
          className="bee-wing-front pointer-events-none absolute left-[6%] top-[6%] z-20 w-[62%] opacity-90"
          style={{ transformOrigin: '84% 84%' }}
        />
      </div>
    </div>
  );
};
