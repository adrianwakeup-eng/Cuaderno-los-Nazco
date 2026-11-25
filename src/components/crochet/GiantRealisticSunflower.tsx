import React, { useMemo } from 'react';

interface GiantRealisticSunflowerProps {
  className?: string;
}

const GOLDEN_ANGLE = 137.507764 * (Math.PI / 180);

/**
 * Giant photorealistic botanical sunflower for desktop mode:
 * - Multi-layered shaded & veined golden petals (3 overlapping depths)
 * - True mathematical Fibonacci phyllotaxis seed disk (175 individual florets)
 * - Organic curved stem + veined serrated leaves with independent breeze sway
 * - Floating golden sunlit pollen motes
 */
export const GiantRealisticSunflower: React.FC<GiantRealisticSunflowerProps> = ({
  className = 'w-64',
}) => {
  const { backPetals, midPetals, frontPetals, seeds, pollenRing } = useMemo(() => {
    const mkPetals = (count: number, angleOffset: number, lenMin: number, lenMax: number, width: number) =>
      Array.from({ length: count }, (_, i) => {
        const deg = (i * 360) / count + angleOffset + ((i % 3) - 1) * 1.6;
        const len = lenMin + ((i * 7) % 5) * ((lenMax - lenMin) / 4);
        const w = width + ((i * 3) % 3) * 1.1;
        return { deg, len, w };
      });

    // 3 lush overlapping botanical layers = 56 individually sculpted petals
    const back = mkPetals(20, 4, 86, 98, 17);
    const mid = mkPetals(20, 13, 76, 88, 15.5);
    const front = mkPetals(16, 0, 62, 72, 13.5);

    // True Fibonacci phyllotaxis spiral (175 seeds in the dark velvety disk)
    const cx = 150;
    const cy = 148;
    const diskR = 45;
    const seedList = Array.from({ length: 175 }, (_, n) => {
      const ratio = Math.sqrt((n + 0.5) / 175);
      const r = ratio * diskR;
      const theta = n * GOLDEN_ANGLE;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      const size = 1.65 + ratio * 1.75;
      const fill =
        ratio < 0.28
          ? '#1E0E05'
          : ratio < 0.58
            ? '#3B1B08'
            : ratio < 0.80
              ? '#5C2C0C'
              : '#92400E';
      const highlight = ratio > 0.76 ? '#F59E0B' : ratio > 0.45 ? '#78350F' : '#2D1609';
      return { x, y, size, fill, highlight, ratio };
    });

    // Glowing sunlit golden pollen florets along the rim of the seed head
    const ring = Array.from({ length: 34 }, (_, i) => {
      const a = (i / 34) * Math.PI * 2;
      const r = diskR + 1.5 + (i % 2) * 2;
      return {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        r: 2.2 + (i % 3) * 0.55,
      };
    });

    return { backPetals: back, midPetals: mid, frontPetals: front, seeds: seedList, pollenRing: ring };
  }, []);

  return (
    <div
      className={`sunflower-sway-root relative select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 300 410"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full overflow-visible drop-shadow-[0_18px_28px_rgba(32,20,4,0.38)]"
      >
        <defs>
          {/* Realistic sunlit petal gradients (3 depth layers) */}
          <linearGradient id="sfPetalBack" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE169" />
            <stop offset="45%" stopColor="#E68A00" />
            <stop offset="85%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#7C2D12" />
          </linearGradient>

          <linearGradient id="sfPetalMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF08A" />
            <stop offset="35%" stopColor="#FACC15" />
            <stop offset="78%" stopColor="#EA8C08" />
            <stop offset="100%" stopColor="#9A3412" />
          </linearGradient>

          <linearGradient id="sfPetalFront" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF9C4" />
            <stop offset="40%" stopColor="#FDE047" />
            <stop offset="82%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Velvety 3D sunflower seed center */}
          <radialGradient id="sfDiskGrad" cx="42%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#5A2B0E" />
            <stop offset="45%" stopColor="#351606" />
            <stop offset="82%" stopColor="#1E0C03" />
            <stop offset="100%" stopColor="#4A2308" />
          </radialGradient>

          {/* Realistic ribbed botanical stem */}
          <linearGradient id="sfStemGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#144526" />
            <stop offset="38%" stopColor="#2E7D32" />
            <stop offset="68%" stopColor="#4CAF50" />
            <stop offset="100%" stopColor="#10361D" />
          </linearGradient>

          {/* Botanical leaf gradients */}
          <linearGradient id="sfLeafGradL" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#65A30D" />
            <stop offset="42%" stopColor="#2E7D32" />
            <stop offset="100%" stopColor="#0F3B1F" />
          </linearGradient>

          <linearGradient id="sfLeafGradR" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#84CC16" />
            <stop offset="45%" stopColor="#1E6B38" />
            <stop offset="100%" stopColor="#0D331B" />
          </linearGradient>

          {/* Warm solar glow behind the giant bloom */}
          <radialGradient id="sfSunAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF4A8" stopOpacity="0.62" />
            <stop offset="55%" stopColor="#F59E0B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft warm sunlit aura behind the blossom */}
        <circle cx="150" cy="148" r="136" fill="url(#sfSunAura)" className="sunflower-aura-pulse" />

        {/* Organic curving botanical stem anchored at bottom */}
        <path
          d="M150 170 C142 235, 134 300, 126 415"
          stroke="url(#sfStemGrad)"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M148 176 C140 240, 133 304, 125 412"
          stroke="#86EFAC"
          strokeOpacity="0.32"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Left large botanical leaf with independent gentle sway */}
        <g className="sunflower-leaf-left" style={{ transformOrigin: '136px 298px' }}>
          <path
            d="M138 298 C105 278, 56 266, 20 284 C36 320, 70 356, 118 342 C132 337, 138 318, 138 298 Z"
            fill="url(#sfLeafGradL)"
            stroke="#14532D"
            strokeWidth="1.5"
          />
          {/* Leaf midrib & veins */}
          <path
            d="M134 301 C100 295, 62 290, 26 286"
            stroke="#BEF264"
            strokeOpacity="0.55"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M104 297 C92 286, 78 280, 62 278 M88 295 C76 312, 62 324, 46 324 M114 302 C102 320, 92 332, 76 336"
            stroke="#A3E635"
            strokeOpacity="0.4"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </g>

        {/* Right large botanical leaf with independent gentle sway */}
        <g className="sunflower-leaf-right" style={{ transformOrigin: '140px 266px' }}>
          <path
            d="M141 268 C178 240, 232 232, 272 256 C252 298, 212 330, 162 312 C146 306, 141 286, 141 268 Z"
            fill="url(#sfLeafGradR)"
            stroke="#14532D"
            strokeWidth="1.5"
          />
          <path
            d="M146 271 C184 264, 224 260, 265 258"
            stroke="#BEF264"
            strokeOpacity="0.55"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M178 265 C192 252, 206 246, 224 246 M198 264 C210 282, 224 292, 240 294 M168 272 C180 290, 192 302, 208 306"
            stroke="#A3E635"
            strokeOpacity="0.4"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </g>

        {/* Living Giant Sunflower Blossom Head (nods & breathes gently in the sun) */}
        <g className="sunflower-head-breathe" style={{ transformOrigin: '150px 148px' }}>
          {/* Green botanical sepal calyx peeking behind petals */}
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={`sep-${i}`}
              d="M150 148 Q138 96 150 66 Q162 96 150 148 Z"
              fill="#15803D"
              stroke="#14532D"
              strokeWidth="1"
              opacity="0.88"
              transform={`rotate(${i * 30 + 15} 150 148)`}
            />
          ))}

          {/* Layer 1: Deep Back Petals (warm burnt amber & golden shadow depth) */}
          {backPetals.map((p, i) => (
            <g key={`bp-${i}`} transform={`rotate(${p.deg} 150 148)`}>
              <path
                d={`M150 148 C${150 - p.w} ${148 - p.len * 0.42}, ${150 - p.w * 0.72} ${148 - p.len * 0.84}, 150 ${148 - p.len} C${150 + p.w * 0.72} ${148 - p.len * 0.84}, ${150 + p.w} ${148 - p.len * 0.42}, 150 148 Z`}
                fill="url(#sfPetalBack)"
                stroke="#92400E"
                strokeOpacity="0.42"
                strokeWidth="0.9"
              />
            </g>
          ))}

          {/* Layer 2: Middle Lush Veined Petals */}
          {midPetals.map((p, i) => (
            <g key={`mp-${i}`} transform={`rotate(${p.deg} 150 148)`}>
              <path
                d={`M150 148 C${150 - p.w} ${148 - p.len * 0.44}, ${150 - p.w * 0.66} ${148 - p.len * 0.86}, 150 ${148 - p.len} C${150 + p.w * 0.66} ${148 - p.len * 0.86}, ${150 + p.w} ${148 - p.len * 0.44}, 150 148 Z`}
                fill="url(#sfPetalMid)"
                stroke="#B45309"
                strokeOpacity="0.35"
                strokeWidth="0.8"
              />
              {/* Fine natural central petal vein */}
              <path
                d={`M150 ${148 - p.len * 0.34} L150 ${148 - p.len * 0.88}`}
                stroke="#FEF08A"
                strokeOpacity="0.52"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Layer 3: Sunlit Front Crown Petals */}
          {frontPetals.map((p, i) => (
            <g key={`fp-${i}`} transform={`rotate(${p.deg} 150 148)`}>
              <path
                d={`M150 148 C${150 - p.w} ${148 - p.len * 0.46}, ${150 - p.w * 0.62} ${148 - p.len * 0.86}, 150 ${148 - p.len} C${150 + p.w * 0.62} ${148 - p.len * 0.86}, ${150 + p.w} ${148 - p.len * 0.46}, 150 148 Z`}
                fill="url(#sfPetalFront)"
                stroke="#D97706"
                strokeOpacity="0.28"
                strokeWidth="0.7"
              />
              <path
                d={`M150 ${148 - p.len * 0.4} L150 ${148 - p.len * 0.86}`}
                stroke="#FFFFFF"
                strokeOpacity="0.45"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </g>
          ))}

          {/* Outer sunlit golden pollen ring */}
          {pollenRing.map((dot, i) => (
            <circle
              key={`pr-${i}`}
              cx={dot.x}
              cy={dot.y}
              r={dot.r}
              fill={i % 2 === 0 ? '#FDE047' : '#F59E0B'}
              opacity="0.92"
            />
          ))}

          {/* Velvety 3D Seed Center Base */}
          <circle
            cx="150"
            cy="148"
            r="48"
            fill="url(#sfDiskGrad)"
            stroke="#78350F"
            strokeWidth="2.2"
          />

          {/* True Mathematical Fibonacci Spiral Seed Matrix (175 individual florets) */}
          {seeds.map((s, i) => (
            <g key={`sd-${i}`}>
              <circle cx={s.x} cy={s.y} r={s.size} fill={s.fill} />
              <circle
                cx={s.x - s.size * 0.25}
                cy={s.y - s.size * 0.25}
                r={s.size * 0.42}
                fill={s.highlight}
                opacity={s.ratio > 0.72 ? 0.85 : 0.48}
              />
            </g>
          ))}

          {/* Soft 3D spherical daylight reflection over the seed disk */}
          <ellipse
            cx="138"
            cy="135"
            rx="24"
            ry="18"
            fill="#FDE68A"
            opacity="0.09"
            transform="rotate(-24 138 135)"
          />
        </g>

        {/* Floating golden sunlit pollen motes drifting gently */}
        <circle cx="72" cy="84" r="3" fill="#FEF08A" className="sunflower-mote-1" />
        <circle cx="228" cy="96" r="2.4" fill="#FDE047" className="sunflower-mote-2" />
        <circle cx="192" cy="46" r="2.8" fill="#FFFBEB" className="sunflower-mote-3" />
      </svg>
    </div>
  );
};
