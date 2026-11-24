import React from 'react';
import type { ReactionKey } from '../../types';

/** 7 Amigurumi Reactions mapped cleanly to existing ReactionKey values */
export const AMIGURUMI_REACTIONS: {
  key: ReactionKey;
  label: string;
  yarnBg: string;
  stitchColor: string;
  badgeEmoji: string;
}[] = [
  { key: '❤️', label: 'Corazón', yarnBg: '#D9443C', stitchColor: '#FFB3AE', badgeEmoji: '🧶❤️' },
  { key: '🥰', label: 'Abrazo', yarnBg: '#E69A32', stitchColor: '#FFE4A3', badgeEmoji: '🤗' },
  { key: '😂', label: 'Risa', yarnBg: '#F2C443', stitchColor: '#FFF5C4', badgeEmoji: '😄' },
  { key: '👏', label: 'Aplausos', yarnBg: '#398B4B', stitchColor: '#B8E8C2', badgeEmoji: '👏' },
  { key: '🥹', label: 'Flor', yarnBg: '#DB5A87', stitchColor: '#FFC4D8', badgeEmoji: '🌻' },
  { key: '🎉', label: 'Estrella', yarnBg: '#16466C', stitchColor: '#A7D3F5', badgeEmoji: '⭐' },
  { key: '🙏', label: 'Regalo', yarnBg: '#9B5B35', stitchColor: '#F3D2B3', badgeEmoji: '🎁' },
];

/** Top Tropical Foliage Canopy + Warm Glowing Fairy String Lights */
export const TropicalCanopyLights: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={`pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden ${
      compact ? 'h-9' : 'h-14'
    }`}
    aria-hidden="true"
  >
    {/* String light golden cord */}
    <svg
      viewBox="0 0 1200 56"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <defs>
        <radialGradient id="fairyGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7CC" stopOpacity="1" />
          <stop offset="45%" stopColor="#F2C443" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#F2C443" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="leafGradA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#58A85B" />
          <stop offset="100%" stopColor="#164D32" />
        </linearGradient>
        <linearGradient id="leafGradB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#72BD64" />
          <stop offset="100%" stopColor="#266B41" />
        </linearGradient>
      </defs>

      {/* Delicate draped fairy-light wire */}
      <path
        d="M0,10 Q150,36 300,14 T600,18 T900,14 T1200,12"
        fill="none"
        stroke="#7D5E33"
        strokeWidth="1.5"
        strokeOpacity="0.65"
      />

      {/* Swaying tropical leaf clusters */}
      <g className="animate-leaf-sway">
        <ellipse cx="48" cy="8" rx="34" ry="12" transform="rotate(18 48 8)" fill="url(#leafGradA)" />
        <ellipse cx="92" cy="14" rx="26" ry="9" transform="rotate(-12 92 14)" fill="url(#leafGradB)" />
        <ellipse cx="360" cy="7" rx="32" ry="11" transform="rotate(14 360 7)" fill="url(#leafGradA)" />
        <ellipse cx="404" cy="12" rx="24" ry="8" transform="rotate(-18 404 12)" fill="url(#leafGradB)" />
        <ellipse cx="775" cy="9" rx="34" ry="11" transform="rotate(16 775 9)" fill="url(#leafGradA)" />
        <ellipse cx="825" cy="13" rx="26" ry="9" transform="rotate(-14 825 13)" fill="url(#leafGradB)" />
        <ellipse cx="1110" cy="9" rx="36" ry="12" transform="rotate(-18 1110 9)" fill="url(#leafGradA)" />
        <ellipse cx="1164" cy="14" rx="28" ry="10" transform="rotate(14 1164 14)" fill="url(#leafGradB)" />
      </g>

      {/* Warm twinkling fairy bulbs */}
      {[120, 240, 390, 520, 680, 840, 990, 1120].map((cx, i) => (
        <g
          key={cx}
          className="animate-fairy-twinkle"
          style={{ animationDelay: `${i * 0.42}s` }}
        >
          <circle cx={cx} cy={18 + (i % 2) * 8} r="14" fill="url(#fairyGlow)" />
          <circle cx={cx} cy={18 + (i % 2) * 8} r="3.4" fill="#FFFDF0" />
        </g>
      ))}
    </svg>
  </div>
);

/** Braided Macramé Wall Hanging & Rosette Tassel (Top-Left Decorative Accent) */
export const MacrameRosetteHanging: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 110 175"
    className={`pointer-events-none select-none drop-shadow-[0_10px_14px_rgba(68,45,18,0.28)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="macCord" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFF7E8" />
        <stop offset="55%" stopColor="#E6CFAF" />
        <stop offset="100%" stopColor="#BA9254" />
      </linearGradient>
    </defs>
    {/* Hanging braided cords */}
    <path d="M55,2 L26,48 M55,2 L84,48" stroke="url(#macCord)" strokeWidth="5" strokeLinecap="round" />
    {/* Knotted cream crochet rosette */}
    <circle cx="55" cy="48" r="24" fill="#F6E9D3" stroke="#BA9254" strokeWidth="2.5" strokeDasharray="5 3" />
    <circle cx="55" cy="48" r="15" fill="#E9D3B0" stroke="#9A743B" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="55" cy="48" r="7" fill="#FFF8EC" stroke="#BA9254" strokeWidth="1.5" />
    {/* Macramé diamond knots */}
    <path
      d="M28,72 L55,98 L82,72 M34,88 L55,112 L76,88 M40,104 L55,124 L70,104"
      fill="none"
      stroke="url(#macCord)"
      strokeWidth="4.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Soft cotton fringe tassels */}
    {[30, 38, 46, 55, 64, 72, 80].map((x, idx) => (
      <line
        key={x}
        x1={x}
        y1={110 + Math.abs(3 - idx) * 2}
        x2={x + (idx - 3) * 1.1}
        y2={156 + (idx % 2) * 10}
        stroke="url(#macCord)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

/** 3D Knitted Crochet Sunflower */
export const CrochetSunflower: React.FC<{ className?: string }> = ({ className = 'h-16 w-16' }) => (
  <svg
    viewBox="0 0 100 100"
    className={`select-none drop-shadow-[0_6px_10px_rgba(74,48,14,0.28)] ${className}`}
    aria-hidden="true"
  >
    {/* Green crochet leaves behind petals */}
    <ellipse cx="22" cy="76" rx="18" ry="8" transform="rotate(-32 22 76)" fill="#266B41" stroke="#164D32" strokeWidth="2" />
    <ellipse cx="78" cy="76" rx="18" ry="8" transform="rotate(32 78 76)" fill="#398B4B" stroke="#164D32" strokeWidth="2" />
    {/* Outer knitted petals */}
    {Array.from({ length: 12 }, (_, i) => (
      <ellipse
        key={i}
        cx="50"
        cy="17"
        rx="8.5"
        ry="15"
        transform={`rotate(${i * 30} 50 50)`}
        fill={i % 2 === 0 ? '#F2C443' : '#E3A723'}
        stroke="#B57910"
        strokeWidth="1.5"
      />
    ))}
    {/* Inner stitched petals */}
    {Array.from({ length: 12 }, (_, i) => (
      <ellipse
        key={i}
        cx="50"
        cy="23"
        rx="5.5"
        ry="10"
        transform={`rotate(${i * 30 + 15} 50 50)`}
        fill="#FFE07A"
        stroke="#C78A16"
        strokeWidth="1"
      />
    ))}
    {/* Woven brown yarn seed center */}
    <circle cx="50" cy="50" r="19" fill="#593518" stroke="#3B210C" strokeWidth="2.5" />
    <circle cx="50" cy="50" r="14" fill="none" stroke="#8C592E" strokeWidth="2" strokeDasharray="3 3" />
    <circle cx="50" cy="50" r="7" fill="none" stroke="#BA824E" strokeWidth="1.8" strokeDasharray="2 3" />
  </svg>
);

/** 3D Amigurumi Crochet Family House (Bottom-Left Desktop & Warm Empty States) */
export const CrochetHouseAmigurumi: React.FC<{ className?: string }> = ({ className = 'w-44' }) => (
  <svg
    viewBox="0 0 210 215"
    className={`pointer-events-none select-none drop-shadow-[0_18px_24px_rgba(32,20,10,0.34)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="roofPink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#D6607B" />
        <stop offset="100%" stopColor="#8F2E49" />
      </linearGradient>
      <linearGradient id="wallCream" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FBF1DD" />
        <stop offset="100%" stopColor="#DFC092" />
      </linearGradient>
      <radialGradient id="winGlow" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#FFF7B8" />
        <stop offset="100%" stopColor="#F2A92C" />
      </radialGradient>
    </defs>
    {/* Potted lush tropical foliage behind house */}
    <ellipse cx="164" cy="148" rx="34" ry="15" transform="rotate(-24 164 148)" fill="#2E7D43" />
    <ellipse cx="172" cy="166" rx="28" ry="13" transform="rotate(14 172 166)" fill="#164D32" />
    <ellipse cx="152" cy="132" rx="24" ry="11" transform="rotate(-48 152 132)" fill="#4EA658" />
    {/* Woven wicker planter basket */}
    <rect x="132" y="168" width="58" height="36" rx="10" fill="#CFA46A" stroke="#8C6534" strokeWidth="2.5" />
    <path d="M136,180 H186 M136,192 H186" stroke="#8C6534" strokeWidth="2" strokeDasharray="6 4" />

    {/* Crochet cottage body */}
    <rect x="28" y="96" width="114" height="106" rx="16" fill="url(#wallCream)" stroke="#BA9254" strokeWidth="3" />
    {/* Horizontal knitted stitch lines on cottage walls */}
    {[112, 128, 144, 160, 176, 190].map((y) => (
      <line key={y} x1="34" y1={y} x2="136" y2={y} stroke="#C7A26B" strokeWidth="1.6" strokeDasharray="5 4" opacity="0.65" />
    ))}

    {/* Knitted scalloped pink roof */}
    <path
      d="M14,104 L85,30 L156,104 Q158,113 148,113 L22,113 Q12,113 14,104 Z"
      fill="url(#roofPink)"
      stroke="#752038"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M36,96 L85,46 L134,96" fill="none" stroke="#F8B4C4" strokeWidth="2" strokeDasharray="5 4" opacity="0.7" />
    {/* Roof pom-pom */}
    <circle cx="85" cy="24" r="9" fill="#F2C443" stroke="#B27B11" strokeWidth="2" />

    {/* Knitted red heart under gable */}
    <path
      d="M85,84 C85,84 74,77 74,70 C74,66 77.5,63.5 81,65.5 C83,66.6 84.3,68.2 85,69.5 C85.7,68.2 87,66.6 89,65.5 C92.5,63.5 96,66 96,70 C96,77 85,84 85,84 Z"
      fill="#C93232"
      stroke="#7D1818"
      strokeWidth="1.5"
    />

    {/* Glowing warm windows */}
    <rect x="44" y="122" width="32" height="34" rx="8" fill="url(#winGlow)" stroke="#8B5A2B" strokeWidth="3" />
    <path d="M60,122 V156 M44,139 H76" stroke="#8B5A2B" strokeWidth="2.5" />

    <rect x="94" y="122" width="32" height="34" rx="8" fill="url(#winGlow)" stroke="#8B5A2B" strokeWidth="3" />
    <path d="M110,122 V156 M94,139 H126" stroke="#8B5A2B" strokeWidth="2.5" />

    {/* Flower box at base with colorful crochet blossoms */}
    <rect x="34" y="176" width="102" height="24" rx="8" fill="#2A6E3E" stroke="#164D32" strokeWidth="2.2" />
    {[46, 64, 84, 104, 122].map((cx, i) => (
      <circle
        key={cx}
        cx={cx}
        cy={176}
        r="7"
        fill={['#F2C443', '#E85D75', '#FFFFFF', '#F2C443', '#49A3E0'][i]}
        stroke="#6A481E"
        strokeWidth="1.4"
      />
    ))}
  </svg>
);

/** Braided Brazilian Crochet Blanket & Macramé Fringe (Bottom-Right Desktop Accent) */
export const BrazilianCrochetThrow: React.FC<{ className?: string }> = ({ className = 'w-52' }) => (
  <svg
    viewBox="0 0 220 190"
    className={`pointer-events-none select-none drop-shadow-[0_14px_24px_rgba(22,42,60,0.3)] ${className}`}
    aria-hidden="true"
  >
    {/* Deep ocean-blue crochet outer border */}
    <path
      d="M20,190 C32,126 76,58 148,24 C178,10 202,6 220,4 L220,190 Z"
      fill="#16466C"
      stroke="#0F3350"
      strokeWidth="3"
    />
    {/* Solar yellow crochet stripe */}
    <path
      d="M42,190 C52,132 92,72 158,40 C184,27 204,23 220,20 L220,190 Z"
      fill="#F2C443"
      stroke="#BA8516"
      strokeWidth="3"
      strokeDasharray="8 4"
    />
    {/* Natural cream cotton macramé body */}
    <path
      d="M66,190 C76,138 110,88 170,58 C192,47 208,43 220,40 L220,190 Z"
      fill="#F5EBDD"
      stroke="#BA9254"
      strokeWidth="3"
    />
    {/* Macramé diamond weave lines */}
    <path
      d="M95,180 L132,136 L168,180 M132,136 L168,96 L206,136 M114,158 L150,158 M150,116 L186,116"
      fill="none"
      stroke="#C9A875"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Fringe tassels */}
    {[80, 92, 104, 116, 128, 140, 152, 164, 176, 188, 200].map((x, idx) => (
      <line
        key={x}
        x1={x}
        y1={174 - (idx % 3) * 4}
        x2={x - 3}
        y2={190}
        stroke="#DFC49B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    ))}
  </svg>
);

/** 3D Crochet Vintage Camera (Welcome Banner Left) */
export const CrochetCamera3D: React.FC<{ className?: string }> = ({ className = 'h-16 w-20' }) => (
  <svg
    viewBox="0 0 110 86"
    className={`select-none drop-shadow-[0_8px_12px_rgba(38,24,8,0.38)] ${className}`}
    aria-hidden="true"
  >
    <rect x="24" y="10" width="26" height="12" rx="5" fill="#B57910" stroke="#6E4706" strokeWidth="2" />
    <rect x="74" y="13" width="14" height="8" rx="4" fill="#398B4B" stroke="#164D32" strokeWidth="1.8" />
    <rect x="10" y="20" width="90" height="58" rx="15" fill="#E6A938" stroke="#8C5D12" strokeWidth="2.8" />
    <rect x="15" y="25" width="80" height="48" rx="11" fill="none" stroke="#FFF0B8" strokeWidth="1.8" strokeDasharray="4 3" />
    <rect x="10" y="38" width="90" height="22" fill="#8C5324" opacity="0.88" />
    <circle cx="55" cy="49" r="20" fill="#231A12" stroke="#F2C443" strokeWidth="3.2" />
    <circle cx="55" cy="49" r="12.5" fill="#16466C" stroke="#88BBE0" strokeWidth="1.8" />
    <circle cx="50" cy="44" r="4" fill="#FFFFFF" opacity="0.78" />
    <circle cx="84" cy="31" r="4" fill="#FFF7D6" stroke="#8C5D12" strokeWidth="1.4" />
  </svg>
);

/** 3D Plump Knitted Red Crochet Heart */
export const CrochetHeart3D: React.FC<{ className?: string }> = ({ className = 'h-12 w-12' }) => (
  <svg
    viewBox="0 0 80 76"
    className={`select-none drop-shadow-[0_8px_12px_rgba(128,22,22,0.36)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="heartYarn" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#F26B63" />
        <stop offset="55%" stopColor="#C92E2A" />
        <stop offset="100%" stopColor="#851614" />
      </radialGradient>
    </defs>
    <path
      d="M40,68 C40,68 10,49 10,27 C10,15 19.5,8 29.5,11 C34.5,12.5 38,16 40,19.5 C42,16 45.5,12.5 50.5,11 C60.5,8 70,15 70,27 C70,49 40,68 40,68 Z"
      fill="url(#heartYarn)"
      stroke="#7A1311"
      strokeWidth="2.5"
    />
    <path
      d="M40,60 C40,60 17,45 17,28 C17,19.5 23.5,15.5 30,17.5 C34,18.8 37.5,22 40,25.5 C42.5,22 46,18.8 50,17.5 C56.5,15.5 63,19.5 63,28 C63,45 40,60 40,60 Z"
      fill="none"
      stroke="#FFB8B3"
      strokeWidth="2"
      strokeDasharray="4 3"
      opacity="0.72"
    />
  </svg>
);

/** 3D Crochet Mini Brazil Globe (Welcome Banner Right) */
export const CrochetBrazilGlobeMini: React.FC<{ className?: string }> = ({ className = 'h-20 w-20' }) => (
  <svg
    viewBox="0 0 110 110"
    className={`select-none drop-shadow-[0_10px_16px_rgba(14,44,72,0.42)] ${className}`}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="oceanYarn" cx="35%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#468BC4" />
        <stop offset="65%" stopColor="#16466C" />
        <stop offset="100%" stopColor="#0B2740" />
      </radialGradient>
    </defs>
    <circle cx="55" cy="55" r="46" fill="url(#oceanYarn)" stroke="#0E304D" strokeWidth="3" />
    {/* Knitted horizontal stitch arcs */}
    {[28, 42, 56, 70, 84].map((y) => (
      <path
        key={y}
        d={`M${55 - Math.sqrt(Math.max(1, 44 * 44 - (y - 55) ** 2))},${y} Q55,${y + 6} ${
          55 + Math.sqrt(Math.max(1, 44 * 44 - (y - 55) ** 2))
        },${y}`}
        fill="none"
        stroke="#8AC2EB"
        strokeWidth="1.4"
        strokeDasharray="4 4"
        opacity="0.45"
      />
    ))}
    {/* Green knitted Brazil / South America patch */}
    <path
      d="M42,26 C56,22 76,30 82,46 C86,58 76,76 62,86 C52,92 44,82 40,70 C36,56 30,32 42,26 Z"
      fill="#398B4B"
      stroke="#164D32"
      strokeWidth="2.5"
    />
    {/* Brazilian solar yellow diamond & blue center orb */}
    <polygon points="60,38 76,54 60,70 44,54" fill="#F2C443" stroke="#BA8516" strokeWidth="1.8" />
    <circle cx="60" cy="54" r="7.5" fill="#16466C" />
    <path d="M53.5,53.5 Q60,51 66.5,55.5" fill="none" stroke="#FFFDF5" strokeWidth="1.6" />
  </svg>
);

/** Animated Rolling Yarn Ball Loading Indicator */
export const YarnBallLoader: React.FC<{ size?: number; label?: string }> = ({
  size = 38,
  label,
}) => (
  <div className="inline-flex flex-col items-center justify-center gap-1.5">
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className="animate-yarn-spin drop-shadow-sm"
      aria-label={label || 'Cargando'}
    >
      <circle cx="32" cy="32" r="26" fill="#F2C443" stroke="#164D32" strokeWidth="3" />
      <path d="M12,24 Q32,12 52,24" fill="none" stroke="#398B4B" strokeWidth="3" />
      <path d="M10,36 Q32,24 54,36" fill="none" stroke="#164D32" strokeWidth="3" />
      <path d="M14,48 Q32,38 50,48" fill="none" stroke="#BA9254" strokeWidth="3" />
      <path d="M22,10 Q14,32 24,54" fill="none" stroke="#16466C" strokeWidth="2.8" />
      <path d="M40,10 Q48,32 38,54" fill="none" stroke="#398B4B" strokeWidth="2.8" />
    </svg>
    {label && <span className="text-xs font-bold text-forest-700">{label}</span>}
  </div>
);

/** Fluttering Brazilian Crochet Butterfly */
export const CrochetButterfly: React.FC<{ className?: string }> = ({ className = 'h-8 w-8' }) => (
  <svg viewBox="0 0 64 56" className={`animate-butterfly select-none ${className}`} aria-hidden="true">
    <ellipse cx="20" cy="22" rx="14" ry="12" transform="rotate(-24 20 22)" fill="#F2C443" stroke="#BA8516" strokeWidth="2" />
    <ellipse cx="44" cy="22" rx="14" ry="12" transform="rotate(24 44 22)" fill="#F2C443" stroke="#BA8516" strokeWidth="2" />
    <ellipse cx="22" cy="38" rx="10" ry="9" transform="rotate(18 22 38)" fill="#398B4B" stroke="#164D32" strokeWidth="2" />
    <ellipse cx="42" cy="38" rx="10" ry="9" transform="rotate(-18 42 38)" fill="#398B4B" stroke="#164D32" strokeWidth="2" />
    <rect x="29" y="14" width="6" height="30" rx="3" fill="#4D3D2E" />
  </svg>
);

/** Animated Amigurumi Telephone for Incoming Calls */
export const AmigurumiPhone: React.FC<{ className?: string }> = ({ className = 'h-16 w-16' }) => (
  <svg
    viewBox="0 0 80 80"
    className={`animate-phone-ring select-none drop-shadow-[0_10px_14px_rgba(22,77,50,0.38)] ${className}`}
    aria-hidden="true"
  >
    <circle cx="40" cy="40" r="35" fill="#398B4B" stroke="#164D32" strokeWidth="3" />
    <circle cx="40" cy="40" r="29" fill="none" stroke="#F2C443" strokeWidth="2" strokeDasharray="5 4" />
    <path
      d="M27,26 C24,29 24,36 30,45 C36,54 45,58 51,56 C55,54 57,50 56,47 L49,42 C47,41 45,42 43,44 C41,45 38,43 36,40 C34,37 33,34 34,32 C36,30 37,28 36,26 L31,22 C29,21 28,24 27,26 Z"
      fill="#F5EBDD"
      stroke="#BA9254"
      strokeWidth="2.4"
    />
  </svg>
);
