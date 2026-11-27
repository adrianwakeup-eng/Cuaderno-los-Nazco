/**
 * Real-time AR Face-Tracking & Aesthetic Video Effects Engine for WebRTC Calls.
 * - Uses Google MediaPipe FaceLandmarker (468 3D facial landmarks + blendshapes) lazily via CDN.
 * - Renders natural, skin-blended AR masks, studio beauty glow, cinematic color filters,
 *   and joyful interactive family ambience directly onto a live canvas stream transmitted via WebRTC.
 */

export type CallMaskId =
  | 'none'
  | 'sunflower_crown'
  | 'golden_glasses'
  | 'angel_halo'
  | 'butterfly_crown'
  | 'cute_bunny'
  | 'golden_cat'
  | 'heart_blush'
  | 'royal_tiara'
  | 'party_fest'
  | 'vintage_stache';

export type CallFilterId =
  | 'none'
  | 'soft_beauty'
  | 'golden_hour'
  | 'emerald_cinema'
  | 'paris_pastel'
  | 'vintage_film'
  | 'noir_glam'
  | 'vivid_joy';

export type CallMoodId =
  | 'none'
  | 'golden_bokeh'
  | 'falling_petals'
  | 'floating_hearts'
  | 'starry_dream';

export interface CallEffectsState {
  maskId: CallMaskId;
  filterId: CallFilterId;
  moodId: CallMoodId;
  beautyGlow: boolean;
}

export interface CallEffectOption<T extends string> {
  id: T;
  label: string;
  emoji: string;
  accent: string;
  hint?: string;
}

export const CALL_MASK_OPTIONS: CallEffectOption<CallMaskId>[] = [
  { id: 'none', label: 'Sin máscara', emoji: '🚫', accent: 'from-stone-600 to-stone-700' },
  {
    id: 'sunflower_crown',
    label: 'Girasoles',
    emoji: '🌻',
    accent: 'from-amber-400 to-emerald-600',
    hint: 'Sonríe para destellos',
  },
  {
    id: 'golden_glasses',
    label: 'Lentes Chic',
    emoji: '🕶️',
    accent: 'from-amber-300 to-yellow-600',
  },
  {
    id: 'heart_blush',
    label: 'Rubor & Amor',
    emoji: '🥰',
    accent: 'from-rose-400 to-pink-500',
    hint: 'Sonríe para corazones',
  },
  {
    id: 'angel_halo',
    label: 'Aura Dorada',
    emoji: '😇',
    accent: 'from-yellow-200 to-amber-500',
  },
  {
    id: 'butterfly_crown',
    label: 'Mariposas',
    emoji: '🦋',
    accent: 'from-emerald-400 to-amber-400',
    hint: 'Aletean al moverte',
  },
  {
    id: 'cute_bunny',
    label: 'Conejito',
    emoji: '🐰',
    accent: 'from-pink-300 to-rose-400',
  },
  {
    id: 'golden_cat',
    label: 'Gatito',
    emoji: '🐱',
    accent: 'from-amber-300 to-orange-400',
  },
  {
    id: 'royal_tiara',
    label: 'Tiara Real',
    emoji: '👑',
    accent: 'from-yellow-300 to-emerald-500',
  },
  {
    id: 'party_fest',
    label: 'Fiesta',
    emoji: '🥳',
    accent: 'from-emerald-400 to-amber-500',
    hint: 'Abre la boca para magia',
  },
  {
    id: 'vintage_stache',
    label: 'Bigote',
    emoji: '🥸',
    accent: 'from-amber-700 to-stone-800',
  },
];

export const CALL_FILTER_OPTIONS: CallEffectOption<CallFilterId>[] = [
  { id: 'none', label: 'Natural', emoji: '📷', accent: 'from-stone-600 to-stone-700' },
  { id: 'soft_beauty', label: 'Piel Radiante', emoji: '✨', accent: 'from-amber-200 to-rose-300' },
  { id: 'golden_hour', label: 'Hora Dorada', emoji: '🌅', accent: 'from-amber-400 to-orange-500' },
  { id: 'emerald_cinema', label: 'Esmeralda', emoji: '🎬', accent: 'from-emerald-500 to-teal-700' },
  { id: 'paris_pastel', label: 'Pastel Suave', emoji: '🌸', accent: 'from-pink-300 to-amber-200' },
  { id: 'vivid_joy', label: 'Alegría Viva', emoji: '☀️', accent: 'from-yellow-400 to-emerald-400' },
  { id: 'vintage_film', label: 'Película', emoji: '🎞️', accent: 'from-amber-600 to-stone-600' },
  { id: 'noir_glam', label: 'Blanco y Negro', emoji: '🖤', accent: 'from-zinc-400 to-zinc-800' },
];

export const CALL_MOOD_OPTIONS: CallEffectOption<CallMoodId>[] = [
  { id: 'none', label: 'Limpio', emoji: '🚫', accent: 'from-stone-600 to-stone-700' },
  { id: 'golden_bokeh', label: 'Luces Doradas', emoji: '✨', accent: 'from-amber-300 to-yellow-500' },
  { id: 'falling_petals', label: 'Pétalos', emoji: '🌼', accent: 'from-yellow-300 to-amber-500' },
  { id: 'floating_hearts', label: 'Corazones', emoji: '💛', accent: 'from-rose-400 to-amber-400' },
  { id: 'starry_dream', label: 'Estrellas', emoji: '🌟', accent: 'from-indigo-400 to-amber-300' },
];

export function hasAnyCallEffect(state: CallEffectsState): boolean {
  return (
    state.maskId !== 'none' ||
    state.filterId !== 'none' ||
    state.moodId !== 'none' ||
    state.beautyGlow
  );
}

/** Pre-warms MediaPipe 3D FaceLandmarker the moment the user opens the Effects tray */
export function preloadCallFaceTracker(): void {
  void getSharedFaceLandmarker();
}

/* ======================== MEDIAPIPE FACE LANDMARKER LAZY LOADER ======================== */

interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarkerResult {
  faceLandmarks?: NormalizedLandmark[][];
  faceBlendshapes?: { categories: { categoryName: string; score: number }[] }[];
}

interface FaceLandmarkerLike {
  detectForVideo(video: HTMLCanvasElement, timestampMs: number): FaceLandmarkerResult;
}

let sharedLandmarkerPromise: Promise<FaceLandmarkerLike | null> | null = null;
let sharedLandmarkerInstance: FaceLandmarkerLike | null = null;

async function getSharedFaceLandmarker(): Promise<FaceLandmarkerLike | null> {
  if (sharedLandmarkerInstance) return sharedLandmarkerInstance;
  if (sharedLandmarkerPromise) return sharedLandmarkerPromise;

  sharedLandmarkerPromise = (async () => {
    try {
      const cdnUrls = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm',
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs',
      ];
      let visionMod: {
        FilesetResolver?: { forVisionTasks: (wasmRoot: string) => Promise<unknown> };
        FaceLandmarker?: {
          createFromOptions: (vision: unknown, options: Record<string, unknown>) => Promise<FaceLandmarkerLike>;
        };
      } | null = null;

      for (const url of cdnUrls) {
        try {
          visionMod = await import(/* @vite-ignore */ url);
          if (visionMod?.FilesetResolver && visionMod?.FaceLandmarker) break;
        } catch {
          // try next CDN mirror
        }
      }

      if (!visionMod?.FilesetResolver || !visionMod?.FaceLandmarker) {
        return null;
      }

      const fileset = await visionMod.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      const modelAssetPath =
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

      // Prefer GPU acceleration; gracefully fall back to CPU on older WebViews
      for (const delegate of ['GPU', 'CPU'] as const) {
        try {
          const lm = await visionMod.FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath, delegate },
            runningMode: 'VIDEO',
            numFaces: 2,
            outputFaceBlendshapes: true,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
          sharedLandmarkerInstance = lm;
          return lm;
        } catch {
          // fall back to CPU
        }
      }
      return null;
    } catch {
      return null;
    }
  })();

  const result = await sharedLandmarkerPromise;
  if (!result) {
    sharedLandmarkerPromise = null;
  }
  return result;
}

/* ======================== SMOOTHED 3D FACE GEOMETRY & PARTICLES ======================== */

interface Pt {
  x: number;
  y: number;
}

interface TrackedFace {
  forehead: Pt;
  noseBridge: Pt;
  noseTip: Pt;
  philtrum: Pt;
  leftEye: Pt;
  rightEye: Pt;
  leftEyeOuter: Pt;
  rightEyeOuter: Pt;
  leftCheek: Pt;
  rightCheek: Pt;
  leftTemple: Pt;
  rightTemple: Pt;
  mouthCenter: Pt;
  chin: Pt;
  faceWidth: number;
  faceHeight: number;
  eyeDist: number;
  roll: number;
  yaw: number; // -1..1 horizontal head turn
  smile: number; // 0..1
  mouthOpen: number; // 0..1
  opacity: number;
  lastSeenMs: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'heart' | 'star' | 'petal' | 'confetti' | 'butterfly';
  color: string;
  rot: number;
  vRot: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function extractFace(
  lms: NormalizedLandmark[],
  blendshapes: { categoryName: string; score: number }[] | undefined,
  w: number,
  h: number,
  nowMs: number
): TrackedFace {
  const pt = (idx: number): Pt => {
    const lm = lms[idx] ?? lms[0];
    return { x: lm.x * w, y: lm.y * h };
  };

  const forehead = pt(10);
  const noseBridge = pt(168);
  const noseTip = pt(1);
  const philtrum = pt(164);
  const leftEyeOuter = pt(33);
  const leftEyeInner = pt(133);
  const rightEyeInner = pt(362);
  const rightEyeOuter = pt(263);
  const leftEye = {
    x: (leftEyeOuter.x + leftEyeInner.x) * 0.5,
    y: (leftEyeOuter.y + leftEyeInner.y) * 0.5,
  };
  const rightEye = {
    x: (rightEyeOuter.x + rightEyeInner.x) * 0.5,
    y: (rightEyeOuter.y + rightEyeInner.y) * 0.5,
  };
  const leftTemple = pt(234);
  const rightTemple = pt(454);
  const leftCheek = pt(50);
  const rightCheek = pt(280);
  const upperLip = pt(13);
  const lowerLip = pt(14);
  const mouthCenter = {
    x: (upperLip.x + lowerLip.x) * 0.5,
    y: (upperLip.y + lowerLip.y) * 0.5,
  };
  const chin = pt(152);

  const faceWidth = Math.max(24, Math.hypot(rightTemple.x - leftTemple.x, rightTemple.y - leftTemple.y));
  const faceHeight = Math.max(30, Math.hypot(chin.x - forehead.x, chin.y - forehead.y));
  const eyeDist = Math.max(14, Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y));
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  const midTempleX = (leftTemple.x + rightTemple.x) * 0.5;
  const yaw = Math.max(-0.85, Math.min(0.85, ((noseTip.x - midTempleX) / faceWidth) * 2.2));

  let smile = 0;
  let mouthOpen = Math.min(1, Math.hypot(lowerLip.x - upperLip.x, lowerLip.y - upperLip.y) / (faceHeight * 0.14));
  if (blendshapes && blendshapes.length > 0) {
    let smileSum = 0;
    for (const c of blendshapes) {
      if (c.categoryName === 'mouthSmileLeft' || c.categoryName === 'mouthSmileRight') {
        smileSum += c.score * 0.5;
      } else if (c.categoryName === 'jawOpen') {
        mouthOpen = Math.max(mouthOpen, c.score);
      }
    }
    smile = Math.min(1, smileSum);
  }

  return {
    forehead,
    noseBridge,
    noseTip,
    philtrum,
    leftEye,
    rightEye,
    leftEyeOuter,
    rightEyeOuter,
    leftCheek,
    rightCheek,
    leftTemple,
    rightTemple,
    mouthCenter,
    chin,
    faceWidth,
    faceHeight,
    eyeDist,
    roll,
    yaw,
    smile,
    mouthOpen,
    opacity: 1,
    lastSeenMs: nowMs,
  };
}

function smoothFace(prev: TrackedFace, next: TrackedFace): TrackedFace {
  const a = 0.52;
  const r = 0.44;
  return {
    forehead: lerpPt(prev.forehead, next.forehead, a),
    noseBridge: lerpPt(prev.noseBridge, next.noseBridge, a),
    noseTip: lerpPt(prev.noseTip, next.noseTip, a),
    philtrum: lerpPt(prev.philtrum, next.philtrum, a),
    leftEye: lerpPt(prev.leftEye, next.leftEye, a),
    rightEye: lerpPt(prev.rightEye, next.rightEye, a),
    leftEyeOuter: lerpPt(prev.leftEyeOuter, next.leftEyeOuter, a),
    rightEyeOuter: lerpPt(prev.rightEyeOuter, next.rightEyeOuter, a),
    leftCheek: lerpPt(prev.leftCheek, next.leftCheek, a),
    rightCheek: lerpPt(prev.rightCheek, next.rightCheek, a),
    leftTemple: lerpPt(prev.leftTemple, next.leftTemple, a),
    rightTemple: lerpPt(prev.rightTemple, next.rightTemple, a),
    mouthCenter: lerpPt(prev.mouthCenter, next.mouthCenter, a),
    chin: lerpPt(prev.chin, next.chin, a),
    faceWidth: lerp(prev.faceWidth, next.faceWidth, r),
    faceHeight: lerp(prev.faceHeight, next.faceHeight, r),
    eyeDist: lerp(prev.eyeDist, next.eyeDist, r),
    roll: lerpAngle(prev.roll, next.roll, r),
    yaw: lerp(prev.yaw, next.yaw, r),
    smile: lerp(prev.smile, next.smile, 0.35),
    mouthOpen: lerp(prev.mouthOpen, next.mouthOpen, 0.4),
    opacity: Math.min(1, prev.opacity + 0.16),
    lastSeenMs: next.lastSeenMs,
  };
}

/* ======================== HANDCRAFTED REALISTIC AR MASK PAINTERS ======================== */

function drawSoftBlush(ctx: CanvasRenderingContext2D, pt: Pt, rx: number, ry: number, color: string, alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.translate(pt.x, pt.y);
  const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  grad.addColorStop(0, color);
  grad.addColorStop(0.55, color.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, 'rgba(255, 160, 175, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkleStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 1.6;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.24;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMiniSunflower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase);
  // Subtle contact shadow
  ctx.shadowColor = 'rgba(28, 18, 6, 0.36)';
  ctx.shadowBlur = r * 0.45;
  ctx.shadowOffsetY = r * 0.16;

  // Back golden-amber petals
  const petals = 14;
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate((i / petals) * Math.PI * 2);
    const pg = ctx.createLinearGradient(0, -r * 0.2, 0, -r);
    pg.addColorStop(0, '#D97706');
    pg.addColorStop(0.55, '#FACC15');
    pg.addColorStop(1, '#FEF08A');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.64, r * 0.21, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Front bright petals offset by half step
  ctx.shadowColor = 'transparent';
  for (let i = 0; i < petals; i++) {
    ctx.save();
    ctx.rotate(((i + 0.5) / petals) * Math.PI * 2);
    const pg = ctx.createLinearGradient(0, -r * 0.15, 0, -r * 0.88);
    pg.addColorStop(0, '#EA580C');
    pg.addColorStop(0.5, '#FBBF24');
    pg.addColorStop(1, '#FEF9C3');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.56, r * 0.17, r * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Dark velvety seed center
  const cg = ctx.createRadialGradient(-r * 0.08, -r * 0.08, r * 0.04, 0, 0, r * 0.36);
  cg.addColorStop(0, '#78350F');
  cg.addColorStop(0.65, '#451A03');
  cg.addColorStop(1, '#260E02');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Golden pollen ring
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawButterfly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  flap: number,
  hueShift: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const flapScale = 0.35 + 0.65 * Math.abs(Math.cos(flap));

  ctx.shadowColor = 'rgba(15, 35, 22, 0.32)';
  ctx.shadowBlur = size * 0.35;

  const drawWingSide = (dir: number) => {
    ctx.save();
    ctx.scale(dir * flapScale, 1);

    // Upper wing
    const g1 = ctx.createRadialGradient(size * 0.35, -size * 0.25, size * 0.05, size * 0.45, -size * 0.2, size * 0.9);
    if (hueShift > 0.5) {
      g1.addColorStop(0, '#FEF08A');
      g1.addColorStop(0.55, '#F59E0B');
      g1.addColorStop(1, '#065F46');
    } else {
      g1.addColorStop(0, '#A7F3D0');
      g1.addColorStop(0.55, '#10B981');
      g1.addColorStop(1, '#D97706');
    }
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.35, -size * 0.85, size * 1.15, -size * 0.72, size * 0.85, -size * 0.05);
    ctx.bezierCurveTo(size * 0.65, size * 0.1, size * 0.25, size * 0.08, 0, 0);
    ctx.fill();

    // Lower wing
    const g2 = ctx.createRadialGradient(size * 0.28, size * 0.28, size * 0.04, size * 0.32, size * 0.32, size * 0.65);
    g2.addColorStop(0, '#FEF9C3');
    g2.addColorStop(0.6, '#FBBF24');
    g2.addColorStop(1, '#047857');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.55, size * 0.08, size * 0.72, size * 0.68, size * 0.24, size * 0.62);
    ctx.bezierCurveTo(size * 0.05, size * 0.55, 0, size * 0.25, 0, 0);
    ctx.fill();

    // Delicate wing sparkle dot
    ctx.fillStyle = 'rgba(255, 255, 240, 0.82)';
    ctx.beginPath();
    ctx.arc(size * 0.52, -size * 0.32, size * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawWingSide(-1);
  drawWingSide(1);

  // Body
  ctx.fillStyle = '#3B2314';
  ctx.beginPath();
  ctx.ellipse(0, size * 0.06, size * 0.07, size * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTinyHeart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 0.9, -r * 0.35, -r * 0.55, -r * 1.05, 0, -r * 0.42);
  ctx.bezierCurveTo(r * 0.55, -r * 1.05, r * 0.9, -r * 0.35, 0, r * 0.35);
  ctx.fill();
  ctx.restore();
}

function renderFaceMask(
  ctx: CanvasRenderingContext2D,
  face: TrackedFace,
  maskId: CallMaskId,
  t: number,
  spawnParticle: (p: SparkParticle) => void
) {
  if (maskId === 'none' || face.opacity <= 0.02) return;

  const fw = face.faceWidth;
  const fh = face.faceHeight;
  const yawSquash = Math.max(0.68, Math.cos(face.yaw * 0.95));

  ctx.save();
  ctx.globalAlpha = face.opacity;

  /* 1. CORONA DE GIRASOLES */
  if (maskId === 'sunflower_crown') {
    // Soft flattering warm sun-kissed cheek blush
    drawSoftBlush(ctx, face.leftCheek, fw * 0.18, fw * 0.13, 'rgba(244, 152, 128, 0.34)', face.opacity * 0.65);
    drawSoftBlush(ctx, face.rightCheek, fw * 0.18, fw * 0.13, 'rgba(244, 152, 128, 0.34)', face.opacity * 0.65);

    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.04);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    // Subtle shadow cast by floral crown onto forehead
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(42, 26, 12, 0.22)';
    ctx.lineWidth = fw * 0.12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, fw * 0.36, fw * 0.56, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();

    // Lush emerald eucalyptus leaves along the crown arc
    const leafSpots = [-0.52, -0.38, -0.22, -0.06, 0.1, 0.26, 0.42, 0.54];
    leafSpots.forEach((nx, idx) => {
      const lx = nx * fw;
      const ly = Math.pow(nx, 2) * fw * 0.55 - fw * 0.04;
      const leafAng = nx * 1.1 + (idx % 2 === 0 ? -0.45 : 0.45);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(leafAng);
      const lg = ctx.createLinearGradient(-fw * 0.1, 0, fw * 0.12, 0);
      lg.addColorStop(0, '#064E3B');
      lg.addColorStop(0.6, '#059669');
      lg.addColorStop(1, '#34D399');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.115, fw * 0.048, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5 lush handcrafted sunflowers arcing gracefully across the crown
    const flowers = [
      { nx: -0.44, r: 0.125 },
      { nx: -0.23, r: 0.155 },
      { nx: 0.0, r: 0.185 },
      { nx: 0.23, r: 0.155 },
      { nx: 0.44, r: 0.125 },
    ];
    flowers.forEach((fl, i) => {
      const fx = fl.nx * fw;
      const fy = Math.pow(fl.nx, 2) * fw * 0.56 - fw * 0.06;
      const sway = Math.sin(t * 2.1 + i * 1.1) * 0.08;
      drawMiniSunflower(ctx, fx, fy, fw * fl.r, sway);
    });

    // Tiny white chamomile accents
    [-0.33, -0.12, 0.12, 0.33].forEach((nx) => {
      const cx = nx * fw;
      const cy = Math.pow(nx, 2) * fw * 0.56 - fw * 0.12;
      ctx.fillStyle = 'rgba(255, 253, 244, 0.94)';
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * fw * 0.025, cy + Math.sin(a) * fw * 0.025, fw * 0.017, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(cx, cy, fw * 0.014, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    if (face.smile > 0.42 && Math.random() < 0.25) {
      spawnParticle({
        x: face.forehead.x + (Math.random() - 0.5) * fw * 0.9,
        y: face.forehead.y - fh * 0.05,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.7 - Math.random() * 0.8,
        size: fw * (0.03 + Math.random() * 0.025),
        alpha: 0.95,
        life: 0,
        maxLife: 48,
        kind: 'star',
        color: '#FDE047',
        rot: Math.random() * Math.PI,
        vRot: 0.04,
      });
    }
  }

  /* 2. LENTES DORADOS CHIC */
  if (maskId === 'golden_glasses') {
    ctx.save();
    ctx.translate(face.noseBridge.x, face.noseBridge.y + fh * 0.015);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    const lensR = face.eyeDist * 0.43;
    const halfSpan = face.eyeDist * 0.52;
    const frameW = Math.max(2.2, fw * 0.018);

    // Subtle shadow on upper cheeks under rims
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = 'rgba(28, 18, 10, 0.22)';
    ctx.lineWidth = frameW * 2.2;
    [-halfSpan, halfSpan].forEach((cx) => {
      ctx.beginPath();
      ctx.ellipse(cx, lensR * 0.14, lensR, lensR * 0.88, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    });
    ctx.restore();

    // Luxury warm-amber tinted lenses + realistic diagonal reflection sweep
    [-halfSpan, halfSpan].forEach((cx) => {
      const lg = ctx.createLinearGradient(cx, -lensR, cx, lensR);
      lg.addColorStop(0, 'rgba(32, 24, 18, 0.34)');
      lg.addColorStop(0.55, 'rgba(180, 120, 48, 0.18)');
      lg.addColorStop(1, 'rgba(255, 224, 150, 0.12)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(cx, 0, lensR, lensR * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gliding specular reflection streak responsive to head yaw!
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, 0, lensR * 0.92, lensR * 0.80, 0, 0, Math.PI * 2);
      ctx.clip();
      const glareOffset = face.yaw * lensR * 0.9 + Math.sin(t * 1.1) * lensR * 0.15;
      ctx.fillStyle = 'rgba(255, 252, 240, 0.26)';
      ctx.beginPath();
      ctx.moveTo(cx - lensR * 0.65 + glareOffset, -lensR);
      ctx.lineTo(cx - lensR * 0.22 + glareOffset, -lensR);
      ctx.lineTo(cx - lensR * 0.72 + glareOffset, lensR);
      ctx.lineTo(cx - lensR * 1.1 + glareOffset, lensR);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Polished 18k gold metallic rim
      const rg = ctx.createLinearGradient(cx - lensR, -lensR, cx + lensR, lensR);
      rg.addColorStop(0, '#FEF08A');
      rg.addColorStop(0.35, '#D97706');
      rg.addColorStop(0.7, '#FDE047');
      rg.addColorStop(1, '#92400E');
      ctx.strokeStyle = rg;
      ctx.lineWidth = frameW;
      ctx.beginPath();
      ctx.ellipse(cx, 0, lensR, lensR * 0.88, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Double aviator gold bridge + side temple arms
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = frameW * 0.92;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-halfSpan + lensR * 0.82, -lensR * 0.15);
    ctx.quadraticCurveTo(0, -lensR * 0.36, halfSpan - lensR * 0.82, -lensR * 0.15);
    ctx.stroke();

    ctx.lineWidth = frameW * 0.68;
    ctx.beginPath();
    ctx.moveTo(-halfSpan + lensR * 0.45, -lensR * 0.72);
    ctx.quadraticCurveTo(0, -lensR * 0.82, halfSpan - lensR * 0.45, -lensR * 0.72);
    ctx.stroke();

    // Side arms
    ctx.beginPath();
    ctx.moveTo(-halfSpan - lensR, -lensR * 0.18);
    ctx.lineTo(-halfSpan - lensR * 1.32, -lensR * 0.28);
    ctx.moveTo(halfSpan + lensR, -lensR * 0.18);
    ctx.lineTo(halfSpan + lensR * 1.32, -lensR * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  /* 3. AURA ANGELICAL */
  if (maskId === 'angel_halo') {
    const bob = Math.sin(t * 2.5) * fh * 0.018;
    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.25 + bob);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    // Outer celestial volumetric bloom
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const haloGlow = ctx.createRadialGradient(0, 0, fw * 0.18, 0, 0, fw * 0.68);
    haloGlow.addColorStop(0, 'rgba(255, 245, 195, 0.38)');
    haloGlow.addColorStop(0.55, 'rgba(251, 191, 36, 0.24)');
    haloGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = haloGlow;
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.68, fw * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Luminous golden 3D ring
    ctx.save();
    ctx.shadowColor = 'rgba(253, 224, 71, 0.95)';
    ctx.shadowBlur = fw * 0.09;
    ctx.strokeStyle = '#FEF9C3';
    ctx.lineWidth = Math.max(3, fw * 0.042);
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.44, fw * 0.115, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = Math.max(1.5, fw * 0.016);
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.44, fw * 0.115, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Orbiting tiny stars around the halo
    for (let i = 0; i < 4; i++) {
      const a = t * 1.4 + (i * Math.PI) / 2;
      const sx = Math.cos(a) * fw * 0.52;
      const sy = Math.sin(a) * fw * 0.14;
      drawSparkleStar(ctx, sx, sy, fw * 0.032, '#FFFBEB', 0.85);
    }
    ctx.restore();

    // Delicate starlight glow dots on cheekbones & nose bridge
    drawSparkleStar(ctx, face.leftCheek.x, face.leftCheek.y - fw * 0.04, fw * 0.022, '#FEF08A', 0.8);
    drawSparkleStar(ctx, face.rightCheek.x, face.rightCheek.y - fw * 0.04, fw * 0.022, '#FEF08A', 0.8);
    drawSparkleStar(ctx, face.noseBridge.x, face.noseBridge.y, fw * 0.016, '#FFFBEB', 0.72);
  }

  /* 4. MARIPOSAS DORADAS */
  if (maskId === 'butterfly_crown') {
    // Pearlescent subtle cheek highlight
    drawSoftBlush(ctx, face.leftCheek, fw * 0.17, fw * 0.11, 'rgba(244, 165, 175, 0.30)', face.opacity * 0.55);
    drawSoftBlush(ctx, face.rightCheek, fw * 0.17, fw * 0.11, 'rgba(244, 165, 175, 0.30)', face.opacity * 0.55);

    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.08);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    const bflies = [
      { nx: -0.46, ny: 0.12, s: 0.13, ang: -0.45, phase: 0.2, hue: 0.2 },
      { nx: -0.24, ny: -0.06, s: 0.15, ang: -0.22, phase: 1.5, hue: 0.8 },
      { nx: 0.02, ny: -0.14, s: 0.175, ang: 0.05, phase: 2.7, hue: 0.9 },
      { nx: 0.27, ny: -0.05, s: 0.145, ang: 0.28, phase: 0.9, hue: 0.3 },
      { nx: 0.48, ny: 0.11, s: 0.125, ang: 0.48, phase: 2.1, hue: 0.8 },
    ];
    bflies.forEach((b, i) => {
      const floatY = Math.sin(t * 2.8 + b.phase) * fw * 0.026;
      const flap = t * (6.8 + i * 0.7) + b.phase;
      drawButterfly(ctx, b.nx * fw, b.ny * fw + floatY, fw * b.s, b.ang, flap, b.hue);
    });
    ctx.restore();

    if (face.smile > 0.45 && Math.random() < 0.12) {
      spawnParticle({
        x: face.forehead.x + (Math.random() - 0.5) * fw,
        y: face.forehead.y - fh * 0.15,
        vx: (Math.random() - 0.5) * 1.4,
        vy: -1.1 - Math.random() * 0.9,
        size: fw * 0.07,
        alpha: 0.95,
        life: 0,
        maxLife: 60,
        kind: 'butterfly',
        color: '#FBBF24',
        rot: 0,
        vRot: 0.05,
      });
    }
  }

  /* 5. CONEJITO TIERNO */
  if (maskId === 'cute_bunny') {
    // Plush bunny ears above forehead
    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.10);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    const earSway = Math.sin(t * 3.1) * 0.06 + face.yaw * 0.15;
    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(side * fw * 0.27, 0);
      ctx.rotate(side * 0.20 + earSway);
      ctx.shadowColor = 'rgba(20, 12, 16, 0.26)';
      ctx.shadowBlur = fw * 0.06;

      // Outer velvety cream ear
      const eg = ctx.createLinearGradient(0, 0, 0, -fh * 0.62);
      eg.addColorStop(0, '#F5EFE6');
      eg.addColorStop(0.65, '#FFFDF9');
      eg.addColorStop(1, '#FDE8E8');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(0, -fh * 0.30, fw * 0.135, fh * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner blush-pink ear
      ctx.shadowColor = 'transparent';
      const ig = ctx.createLinearGradient(0, -fh * 0.06, 0, -fh * 0.52);
      ig.addColorStop(0, '#F472B6');
      ig.addColorStop(1, '#FBCFE8');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(0, -fh * 0.28, fw * 0.072, fh * 0.23, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    // Soft peach cheek blush
    drawSoftBlush(ctx, face.leftCheek, fw * 0.19, fw * 0.14, 'rgba(248, 148, 168, 0.42)', face.opacity * 0.72);
    drawSoftBlush(ctx, face.rightCheek, fw * 0.19, fw * 0.14, 'rgba(248, 148, 168, 0.42)', face.opacity * 0.72);

    // Cute soft pink bunny nose + glossy highlight + delicate whiskers
    ctx.save();
    ctx.translate(face.noseTip.x, face.noseTip.y);
    ctx.rotate(face.roll);
    const ng = ctx.createRadialGradient(-fw * 0.02, -fw * 0.02, fw * 0.01, 0, 0, fw * 0.09);
    ng.addColorStop(0, '#FBCFE8');
    ng.addColorStop(0.5, '#F472B6');
    ng.addColorStop(1, '#DB2777');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.moveTo(0, fw * 0.055);
    ctx.bezierCurveTo(-fw * 0.095, -fw * 0.015, -fw * 0.06, -fw * 0.075, 0, -fw * 0.042);
    ctx.bezierCurveTo(fw * 0.06, -fw * 0.075, fw * 0.095, -fw * 0.015, 0, fw * 0.055);
    ctx.fill();

    // Tiny glossy nose highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.ellipse(-fw * 0.022, -fw * 0.025, fw * 0.02, fw * 0.011, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Graceful thin translucent whiskers
    ctx.strokeStyle = 'rgba(255, 250, 245, 0.76)';
    ctx.lineWidth = Math.max(1.2, fw * 0.0085);
    ctx.lineCap = 'round';
    [-1, 1].forEach((side) => {
      [-0.14, 0.02, 0.18].forEach((angOffset, i) => {
        ctx.beginPath();
        ctx.moveTo(side * fw * 0.12, fw * (0.01 + i * 0.022));
        ctx.quadraticCurveTo(
          side * fw * 0.28,
          fw * (0.0 + i * 0.025 + angOffset * 0.2),
          side * fw * 0.42,
          fw * (0.03 + i * 0.04 + angOffset * 0.35)
        );
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  /* 6. GATITO ELEGANTE */
  if (maskId === 'golden_cat') {
    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.05);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.translate(side * fw * 0.34, 0);
      ctx.rotate(side * 0.28);
      ctx.shadowColor = 'rgba(20, 12, 8, 0.3)';
      ctx.shadowBlur = fw * 0.05;

      // Sculpted golden-cream feline ear
      const cg = ctx.createLinearGradient(0, fw * 0.05, 0, -fw * 0.38);
      cg.addColorStop(0, '#92400E');
      cg.addColorStop(0.45, '#D97706');
      cg.addColorStop(1, '#FDE68A');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(-fw * 0.15, fw * 0.04);
      ctx.quadraticCurveTo(-fw * 0.04, -fw * 0.34, 0, -fw * 0.38);
      ctx.quadraticCurveTo(fw * 0.04, -fw * 0.34, fw * 0.15, fw * 0.04);
      ctx.closePath();
      ctx.fill();

      // Inner warm blush ear
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#FBCFE8';
      ctx.beginPath();
      ctx.moveTo(-fw * 0.085, fw * 0.01);
      ctx.quadraticCurveTo(0, -fw * 0.25, 0, -fw * 0.26);
      ctx.quadraticCurveTo(0, -fw * 0.25, fw * 0.085, fw * 0.01);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();

    // Subtle chic feline eyeliner wings at outer eye corners
    ctx.save();
    ctx.strokeStyle = 'rgba(30, 20, 14, 0.62)';
    ctx.lineWidth = Math.max(1.8, fw * 0.012);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(face.leftEyeOuter.x + fw * 0.02, face.leftEyeOuter.y);
    ctx.quadraticCurveTo(face.leftEyeOuter.x - fw * 0.04, face.leftEyeOuter.y - fw * 0.01, face.leftEyeOuter.x - fw * 0.065, face.leftEyeOuter.y - fw * 0.045);
    ctx.moveTo(face.rightEyeOuter.x - fw * 0.02, face.rightEyeOuter.y);
    ctx.quadraticCurveTo(face.rightEyeOuter.x + fw * 0.04, face.rightEyeOuter.y - fw * 0.01, face.rightEyeOuter.x + fw * 0.065, face.rightEyeOuter.y - fw * 0.045);
    ctx.stroke();
    ctx.restore();

    // Cute rose-gold cat nose + delicate dark-gold whiskers
    ctx.save();
    ctx.translate(face.noseTip.x, face.noseTip.y);
    ctx.rotate(face.roll);
    ctx.fillStyle = '#EC4899';
    ctx.beginPath();
    ctx.moveTo(-fw * 0.055, -fw * 0.025);
    ctx.quadraticCurveTo(0, -fw * 0.045, fw * 0.055, -fw * 0.025);
    ctx.quadraticCurveTo(0, fw * 0.048, -fw * 0.055, -fw * 0.025);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 244, 214, 0.8)';
    ctx.lineWidth = Math.max(1.2, fw * 0.008);
    ctx.lineCap = 'round';
    [-1, 1].forEach((side) => {
      [-0.12, 0.04, 0.2].forEach((a, i) => {
        ctx.beginPath();
        ctx.moveTo(side * fw * 0.13, fw * (0.0 + i * 0.022));
        ctx.lineTo(side * fw * 0.42, fw * (0.01 + i * 0.036 + a * 0.24));
        ctx.stroke();
      });
    });
    ctx.restore();
  }

  /* 7. RUBOR & CORAZONES (Snapchat Aesthetic) */
  if (maskId === 'heart_blush') {
    // Seamless watercolor rosy-peach blush across cheeks & bridge of nose
    drawSoftBlush(ctx, face.leftCheek, fw * 0.21, fw * 0.15, 'rgba(244, 114, 146, 0.45)', face.opacity * 0.78);
    drawSoftBlush(ctx, face.rightCheek, fw * 0.21, fw * 0.15, 'rgba(244, 114, 146, 0.45)', face.opacity * 0.78);
    drawSoftBlush(ctx, face.noseTip, fw * 0.11, fw * 0.075, 'rgba(244, 114, 146, 0.34)', face.opacity * 0.52);

    // Delicate sun-kissed freckles
    ctx.save();
    ctx.fillStyle = 'rgba(138, 72, 54, 0.36)';
    [face.leftCheek, face.rightCheek].forEach((ck, sideIdx) => {
      const dir = sideIdx === 0 ? -1 : 1;
      for (let i = 0; i < 6; i++) {
        const fx = ck.x + dir * (i - 2.5) * fw * 0.028;
        const fy = ck.y - fw * 0.03 + Math.sin(i * 2.4) * fw * 0.026;
        ctx.beginPath();
        ctx.arc(fx, fy, Math.max(1, fw * 0.0065), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();

    // Cute glossy rose-gold hearts painted delicately on upper cheeks
    drawTinyHeart(ctx, face.leftCheek.x - fw * 0.03, face.leftCheek.y - fw * 0.03, fw * 0.052, '#FB7185', 0.88);
    drawTinyHeart(ctx, face.leftCheek.x + fw * 0.05, face.leftCheek.y - fw * 0.06, fw * 0.032, '#FBBF24', 0.85);
    drawTinyHeart(ctx, face.rightCheek.x + fw * 0.03, face.rightCheek.y - fw * 0.03, fw * 0.052, '#FB7185', 0.88);
    drawTinyHeart(ctx, face.rightCheek.x - fw * 0.05, face.rightCheek.y - fw * 0.06, fw * 0.032, '#FBBF24', 0.85);

    if (face.smile > 0.38 && Math.random() < 0.22) {
      const src = Math.random() < 0.5 ? face.leftCheek : face.rightCheek;
      spawnParticle({
        x: src.x,
        y: src.y - fw * 0.04,
        vx: (Math.random() - 0.5) * 1.1,
        vy: -1.1 - Math.random() * 1.0,
        size: fw * (0.042 + Math.random() * 0.025),
        alpha: 0.95,
        life: 0,
        maxLife: 54,
        kind: 'heart',
        color: Math.random() < 0.5 ? '#FB7185' : '#FBBF24',
        rot: (Math.random() - 0.5) * 0.4,
        vRot: (Math.random() - 0.5) * 0.03,
      });
    }
  }

  /* 8. TIARA REAL ESMERALDA & ORO */
  if (maskId === 'royal_tiara') {
    ctx.save();
    ctx.translate(face.forehead.x, face.forehead.y - fh * 0.07);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    ctx.shadowColor = 'rgba(20, 14, 4, 0.38)';
    ctx.shadowBlur = fw * 0.05;
    ctx.shadowOffsetY = fw * 0.02;

    // 18k Gold sculpted filigree crown silhouette
    const tg = ctx.createLinearGradient(-fw * 0.4, -fw * 0.3, fw * 0.4, fw * 0.1);
    tg.addColorStop(0, '#B45309');
    tg.addColorStop(0.28, '#FEF08A');
    tg.addColorStop(0.5, '#F59E0B');
    tg.addColorStop(0.75, '#FEF9C3');
    tg.addColorStop(1, '#92400E');

    ctx.strokeStyle = tg;
    ctx.fillStyle = tg;
    ctx.lineWidth = Math.max(2.5, fw * 0.022);
    ctx.lineJoin = 'round';

    // Base band
    ctx.beginPath();
    ctx.moveTo(-fw * 0.44, fw * 0.06);
    ctx.quadraticCurveTo(0, -fw * 0.05, fw * 0.44, fw * 0.06);
    ctx.stroke();

    // Central cathedral peak + side swirls
    ctx.beginPath();
    ctx.moveTo(-fw * 0.42, fw * 0.05);
    ctx.quadraticCurveTo(-fw * 0.30, -fw * 0.16, -fw * 0.22, -fw * 0.16);
    ctx.quadraticCurveTo(-fw * 0.16, -fw * 0.04, -fw * 0.12, -fw * 0.04);
    ctx.quadraticCurveTo(-fw * 0.07, -fw * 0.28, 0, -fw * 0.33);
    ctx.quadraticCurveTo(fw * 0.07, -fw * 0.28, fw * 0.12, -fw * 0.04);
    ctx.quadraticCurveTo(fw * 0.16, -fw * 0.04, fw * 0.22, -fw * 0.16);
    ctx.quadraticCurveTo(fw * 0.30, -fw * 0.16, fw * 0.42, fw * 0.05);
    ctx.stroke();

    // Sparkling emerald centerpiece jewel
    const gemG = ctx.createRadialGradient(-fw * 0.015, -fw * 0.17, fw * 0.01, 0, -fw * 0.15, fw * 0.075);
    gemG.addColorStop(0, '#A7F3D0');
    gemG.addColorStop(0.45, '#10B981');
    gemG.addColorStop(1, '#064E3B');
    ctx.fillStyle = gemG;
    ctx.beginPath();
    ctx.moveTo(0, -fw * 0.24);
    ctx.lineTo(fw * 0.055, -fw * 0.15);
    ctx.lineTo(0, -fw * 0.065);
    ctx.lineTo(-fw * 0.055, -fw * 0.15);
    ctx.closePath();
    ctx.fill();

    // Pearls along peaks
    [
      { x: 0, y: -fw * 0.34, r: 0.028 },
      { x: -fw * 0.22, y: -fw * 0.18, r: 0.022 },
      { x: fw * 0.22, y: -fw * 0.18, r: 0.022 },
    ].forEach((p) => {
      ctx.fillStyle = '#FFFDF7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, fw * p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Animated diamond glint
    const glint = 0.55 + 0.45 * Math.sin(t * 4.2);
    drawSparkleStar(ctx, 0, -fw * 0.22, fw * 0.05 * glint, '#FFFFFF', glint);
    ctx.restore();
  }

  /* 9. FIESTA FAMILIAR */
  if (maskId === 'party_fest') {
    ctx.save();
    ctx.translate(face.forehead.x + fw * 0.06, face.forehead.y - fh * 0.12);
    ctx.rotate(face.roll + 0.18);
    ctx.scale(yawSquash, 1);

    ctx.shadowColor = 'rgba(12, 24, 16, 0.32)';
    ctx.shadowBlur = fw * 0.06;

    // Festive emerald-and-gold striped cone hat
    const hg = ctx.createLinearGradient(-fw * 0.24, 0, fw * 0.24, -fh * 0.54);
    hg.addColorStop(0, '#047857');
    hg.addColorStop(0.5, '#10B981');
    hg.addColorStop(1, '#F59E0B');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-fw * 0.26, 0);
    ctx.lineTo(0, -fh * 0.56);
    ctx.lineTo(fw * 0.26, 0);
    ctx.quadraticCurveTo(0, fw * 0.08, -fw * 0.26, 0);
    ctx.closePath();
    ctx.fill();

    // Diagonal golden ribbon stripes clipped to cone
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = fw * 0.045;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-fw * 0.35, -fh * 0.08 + i * fh * 0.14);
      ctx.lineTo(fw * 0.35, -fh * 0.26 + i * fh * 0.14);
      ctx.stroke();
    }
    ctx.restore();

    // Fluffy golden pom-pom on top
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(0, -fh * 0.58, fw * 0.085, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if ((face.mouthOpen > 0.38 || face.smile > 0.55) && Math.random() < 0.45) {
      const palette = ['#FBBF24', '#10B981', '#FB7185', '#38BDF8', '#FEF08A'];
      spawnParticle({
        x: face.mouthCenter.x + (Math.random() - 0.5) * fw * 0.8,
        y: face.forehead.y - fh * 0.2,
        vx: (Math.random() - 0.5) * 2.8,
        vy: -2.2 - Math.random() * 1.8,
        size: fw * (0.028 + Math.random() * 0.02),
        alpha: 1,
        life: 0,
        maxLife: 58,
        kind: 'confetti',
        color: palette[Math.floor(Math.random() * palette.length)],
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.18,
      });
    }
  }

  /* 10. BIGOTE ELEGANTE */
  if (maskId === 'vintage_stache') {
    ctx.save();
    ctx.translate(face.philtrum.x, face.philtrum.y + fh * 0.012);
    ctx.rotate(face.roll);
    ctx.scale(yawSquash, 1);

    ctx.shadowColor = 'rgba(10, 6, 4, 0.38)';
    ctx.shadowBlur = fw * 0.03;
    ctx.shadowOffsetY = fw * 0.012;

    const mg = ctx.createLinearGradient(0, -fw * 0.05, 0, fw * 0.08);
    mg.addColorStop(0, '#451A03');
    mg.addColorStop(0.45, '#1C1917');
    mg.addColorStop(1, '#292524');
    ctx.fillStyle = mg;

    [-1, 1].forEach((side) => {
      ctx.save();
      ctx.scale(side, 1);
      ctx.beginPath();
      ctx.moveTo(0, -fw * 0.018);
      ctx.bezierCurveTo(fw * 0.09, -fw * 0.082, fw * 0.24, -fw * 0.025, fw * 0.31, -fw * 0.068);
      ctx.bezierCurveTo(fw * 0.34, -fw * 0.088, fw * 0.34, -fw * 0.015, fw * 0.27, fw * 0.022);
      ctx.bezierCurveTo(fw * 0.18, fw * 0.065, fw * 0.06, fw * 0.048, 0, fw * 0.026);
      ctx.closePath();
      ctx.fill();

      // Silky hair highlight
      ctx.strokeStyle = 'rgba(214, 182, 140, 0.26)';
      ctx.lineWidth = Math.max(1, fw * 0.008);
      ctx.beginPath();
      ctx.moveTo(fw * 0.04, -fw * 0.01);
      ctx.quadraticCurveTo(fw * 0.16, -fw * 0.028, fw * 0.26, -fw * 0.015);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  ctx.restore();
}

/* ======================== FILTERS & AMBIENT OVERLAYS ======================== */

function getCanvasFilterString(filterId: CallFilterId, beautyGlow: boolean): string {
  const parts: string[] = [];
  if (beautyGlow && filterId !== 'noir_glam') {
    parts.push('brightness(1.04) contrast(0.97) saturate(1.06)');
  }
  switch (filterId) {
    case 'soft_beauty':
      parts.push('brightness(1.07) contrast(0.95) saturate(1.08)');
      break;
    case 'golden_hour':
      parts.push('brightness(1.06) contrast(1.04) saturate(1.22) sepia(0.18)');
      break;
    case 'emerald_cinema':
      parts.push('contrast(1.10) saturate(1.12) brightness(0.98)');
      break;
    case 'paris_pastel':
      parts.push('brightness(1.09) contrast(0.92) saturate(0.94)');
      break;
    case 'vintage_film':
      parts.push('sepia(0.28) contrast(1.04) brightness(1.02) saturate(0.92)');
      break;
    case 'noir_glam':
      parts.push('grayscale(1) contrast(1.22) brightness(1.04)');
      break;
    case 'vivid_joy':
      parts.push('brightness(1.08) contrast(1.08) saturate(1.28)');
      break;
    default:
      break;
  }
  return parts.length > 0 ? parts.join(' ') : 'none';
}

function applyColorGradeOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filterId: CallFilterId
) {
  if (filterId === 'none') return;
  ctx.save();
  if (filterId === 'golden_hour') {
    ctx.globalCompositeOperation = 'screen';
    const sun = ctx.createRadialGradient(w * 0.18, h * 0.14, 10, w * 0.18, h * 0.14, Math.max(w, h) * 0.78);
    sun.addColorStop(0, 'rgba(255, 206, 118, 0.34)');
    sun.addColorStop(0.5, 'rgba(251, 146, 60, 0.12)');
    sun.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);
  } else if (filterId === 'emerald_cinema') {
    ctx.globalCompositeOperation = 'soft-light';
    const eg = ctx.createLinearGradient(0, 0, w, h);
    eg.addColorStop(0, 'rgba(16, 185, 129, 0.22)');
    eg.addColorStop(0.55, 'rgba(251, 191, 36, 0.10)');
    eg.addColorStop(1, 'rgba(6, 78, 59, 0.35)');
    ctx.fillStyle = eg;
    ctx.fillRect(0, 0, w, h);
  } else if (filterId === 'paris_pastel') {
    ctx.globalCompositeOperation = 'screen';
    const pg = ctx.createLinearGradient(0, 0, 0, h);
    pg.addColorStop(0, 'rgba(255, 228, 236, 0.22)');
    pg.addColorStop(1, 'rgba(254, 243, 199, 0.14)');
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, w, h);
  } else if (filterId === 'vintage_film') {
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.32, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(255, 232, 190, 0.06)');
    vg.addColorStop(1, 'rgba(34, 22, 12, 0.38)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  } else if (filterId === 'noir_glam') {
    const ng = ctx.createRadialGradient(w * 0.5, h * 0.45, Math.min(w, h) * 0.28, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
    ng.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    ng.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
    ctx.fillStyle = ng;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

function drawMoodOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, moodId: CallMoodId, t: number) {
  if (moodId === 'none') return;
  ctx.save();

  if (moodId === 'golden_bokeh') {
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 14; i++) {
      const bx = ((Math.sin(i * 12.7 + t * 0.22) * 0.48 + 0.5) * w);
      const by = ((Math.cos(i * 7.3 - t * 0.18) * 0.48 + 0.5) * h);
      const br = (22 + (i % 5) * 14) * (w / 640);
      const alpha = 0.12 + 0.10 * Math.sin(t * 1.4 + i);
      const g = ctx.createRadialGradient(bx, by, br * 0.15, bx, by, br);
      g.addColorStop(0, `rgba(255, 245, 190, ${alpha})`);
      g.addColorStop(0.6, `rgba(251, 191, 36, ${alpha * 0.55})`);
      g.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (moodId === 'falling_petals') {
    for (let i = 0; i < 16; i++) {
      const speed = 0.08 + (i % 4) * 0.025;
      const py = ((t * speed + i * 0.17) % 1.15 - 0.08) * h;
      const px = ((i * 0.068 + 0.05) + Math.sin(t * 1.1 + i * 1.9) * 0.045) * w;
      const rot = t * 1.2 + i * 0.8;
      const sz = (7 + (i % 4) * 2.5) * (w / 640);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(250, 204, 21, 0.72)' : 'rgba(253, 224, 71, 0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 0, sz, sz * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (moodId === 'floating_hearts') {
    for (let i = 0; i < 12; i++) {
      const progress = (t * (0.12 + (i % 3) * 0.03) + i * 0.19) % 1;
      const py = (1.06 - progress * 1.16) * h;
      const px = ((i * 0.083 + 0.04) + Math.sin(t * 1.7 + i) * 0.035) * w;
      const sz = (9 + (i % 4) * 3.2) * (w / 640);
      const alpha = Math.sin(progress * Math.PI) * 0.72;
      drawTinyHeart(ctx, px, py, sz, i % 3 === 0 ? '#FBBF24' : '#FB7185', alpha);
    }
  } else if (moodId === 'starry_dream') {
    for (let i = 0; i < 18; i++) {
      // Keep stars mostly framing the edges so the face stays clean
      const ang = (i / 18) * Math.PI * 2 + t * 0.05;
      const radX = 0.36 + (i % 3) * 0.07;
      const radY = 0.36 + ((i + 1) % 3) * 0.07;
      const sx = (0.5 + Math.cos(ang) * radX) * w;
      const sy = (0.5 + Math.sin(ang) * radY) * h;
      const twinkle = 0.35 + 0.65 * Math.abs(Math.sin(t * (1.8 + (i % 4) * 0.5) + i * 2.1));
      drawSparkleStar(ctx, sx, sy, (4.5 + (i % 3) * 2.2) * (w / 640), '#FEF08A', twinkle * 0.85);
    }
  }

  ctx.restore();
}

/* ======================== MAIN LIVE VIDEO EFFECTS PIPELINE ======================== */

export class CallVideoEffectsEngine {
  private sourceVideo: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private rafId = 0;
  private running = false;
  private landmarker: FaceLandmarkerLike | null = null;
  private landmarkerRequested = false;
  private lastVideoTime = -1;
  private lastDetectMs = 0;
  private detectionIntervalMs = 100;
  private readonly detectionCanvas = document.createElement('canvas');
  private readonly detectionContext = this.detectionCanvas.getContext('2d', { alpha: false });
  private trackedFaces: TrackedFace[] = [];
  private particles: SparkParticle[] = [];
  private state: CallEffectsState = {
    maskId: 'none',
    filterId: 'none',
    moodId: 'none',
    beautyGlow: false,
  };
  private onTrackerStatus?: (status: 'idle' | 'loading' | 'ready' | 'fallback') => void;

  constructor(onTrackerStatus?: (status: 'idle' | 'loading' | 'ready' | 'fallback') => void) {
    this.onTrackerStatus = onTrackerStatus;
    this.sourceVideo = document.createElement('video');
    this.sourceVideo.autoplay = true;
    this.sourceVideo.muted = true;
    this.sourceVideo.playsInline = true;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;

    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = 160;
    this.blurCanvas.height = 120;
    const bCtx = this.blurCanvas.getContext('2d', { alpha: false });
    if (!bCtx) throw new Error('Blur Canvas 2D no disponible');
    this.blurCtx = bCtx;
  }

  setSourceTrack(track: MediaStreamTrack | null) {
    const source = this.sourceVideo.srcObject as MediaStream | null;
    if ((source?.getVideoTracks()[0] ?? null) === track) return;
    this.lastVideoTime = -1;
    this.trackedFaces = [];
    if (!track) {
      this.sourceVideo.srcObject = null;
      return;
    }
    this.sourceVideo.srcObject = new MediaStream([track]);
    void this.sourceVideo.play().catch(() => {});
  }

  updateState(next: CallEffectsState) {
    this.state = { ...next };
    if (next.maskId !== 'none' && !this.landmarkerRequested) {
      this.ensureLandmarkerLoaded();
    }
  }

  private ensureLandmarkerLoaded() {
    if (this.landmarkerRequested) return;
    this.landmarkerRequested = true;
    this.onTrackerStatus?.('loading');
    void getSharedFaceLandmarker().then((lm) => {
      this.landmarker = lm;
      this.onTrackerStatus?.(lm ? 'ready' : 'fallback');
    });
  }

  start(): MediaStreamTrack | null {
    if (this.running && this.outputStream) {
      return this.outputStream.getVideoTracks()[0] ?? null;
    }
    if (!this.sourceVideo.srcObject) return null;
    if (this.state.maskId !== 'none') {
      this.ensureLandmarkerLoaded();
    }
    if (!this.outputStream) {
      const cap = (this.canvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream })
        .captureStream;
      if (!cap) return null;
      this.outputStream = cap.call(this.canvas, 24);
    }
    const track = this.outputStream.getVideoTracks()[0];
    if (!track) {
      this.stop();
      return null;
    }

    this.running = true;
    const startMs = performance.now();
    const frameIntervalMs = 1000 / 24;
    let nextFrameMs = startMs;
    let lastRenderedVideoTime = -1;
    const tick = (nowMs: number) => {
      if (!this.running) return;
      if (nowMs >= nextFrameMs && this.sourceVideo.readyState >= 2 &&
          this.sourceVideo.currentTime !== lastRenderedVideoTime) {
        lastRenderedVideoTime = this.sourceVideo.currentTime;
        nextFrameMs = Math.max(nextFrameMs + frameIntervalMs, nowMs);
        this.renderFrame(nowMs, (nowMs - startMs) * 0.001);
      }
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
    return this.outputStream.getVideoTracks()[0] ?? null;
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.outputStream?.getTracks().forEach((t) => t.stop());
    this.outputStream = null;
    this.trackedFaces = [];
    this.particles = [];
  }

  destroy() {
    this.stop();
    this.sourceVideo.srcObject = null;
  }

  private renderFrame(nowMs: number, elapsedSec: number) {
    const v = this.sourceVideo;
    if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;

    const maxEdge = 640;
    const scale = Math.min(1, maxEdge / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.max(2, Math.round((v.videoWidth * scale) / 2) * 2);
    const h = Math.max(2, Math.round((v.videoHeight * scale) / 2) * 2);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.blurCanvas.width = Math.max(64, Math.round(w * 0.25));
      this.blurCanvas.height = Math.max(64, Math.round(h * 0.25));
    }

    const ctx = this.ctx;
    const { maskId, filterId, moodId, beautyGlow } = this.state;

    // 1. Draw base camera frame with aesthetic color filter
    ctx.save();
    ctx.filter = getCanvasFilterString(filterId, beautyGlow);
    ctx.drawImage(v, 0, 0, w, h);
    ctx.restore();

    // 2. Optical soft-focus skin glow when "Piel Radiante" or "Toque de Belleza" is active
    if (beautyGlow || filterId === 'soft_beauty') {
      const bw = this.blurCanvas.width;
      const bh = this.blurCanvas.height;
      this.blurCtx.save();
      this.blurCtx.filter = 'blur(5px)';
      this.blurCtx.drawImage(v, 0, 0, bw, bh);
      this.blurCtx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = filterId === 'soft_beauty' ? 0.34 : 0.24;
      ctx.drawImage(this.blurCanvas, 0, 0, w, h);

      // Gentle warm studio key-light bloom
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = filterId === 'soft_beauty' ? 0.14 : 0.09;
      const keyLight = ctx.createRadialGradient(w * 0.5, h * 0.42, w * 0.05, w * 0.5, h * 0.42, Math.max(w, h) * 0.55);
      keyLight.addColorStop(0, 'rgba(255, 244, 224, 1)');
      keyLight.addColorStop(1, 'rgba(255, 244, 224, 0)');
      ctx.fillStyle = keyLight;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // 3. Apply color-grade & lighting overlays (ensures rich look even on Safari without ctx.filter)
    applyColorGradeOverlay(ctx, w, h, filterId);

    // 4. Real-time 468-point FaceLandmarker detection & organic AR mask rendering
    if (maskId !== 'none') {
      if (this.landmarker && this.detectionContext && v.currentTime !== this.lastVideoTime &&
          nowMs - this.lastDetectMs >= this.detectionIntervalMs) {
        this.lastVideoTime = v.currentTime;
        const detectTs = Math.max(this.lastDetectMs + 1, Math.round(nowMs));
        this.lastDetectMs = detectTs;
        try {
          const scale = Math.min(1, 320 / Math.max(w, h));
          const detectionWidth = Math.max(2, Math.round(w * scale));
          const detectionHeight = Math.max(2, Math.round(h * scale));
          if (this.detectionCanvas.width !== detectionWidth || this.detectionCanvas.height !== detectionHeight) {
            this.detectionCanvas.width = detectionWidth;
            this.detectionCanvas.height = detectionHeight;
          }
          const startedAt = performance.now();
          this.detectionContext.drawImage(v, 0, 0, detectionWidth, detectionHeight);
          const res = this.landmarker.detectForVideo(this.detectionCanvas, detectTs);
          const costMs = performance.now() - startedAt;
          this.detectionIntervalMs = Math.min(500, Math.max(100, costMs * 6));
          const detected = res.faceLandmarks ?? [];
          if (detected.length > 0) {
            const nextTracked: TrackedFace[] = detected.map((lms, idx) => {
              const bs = res.faceBlendshapes?.[idx]?.categories;
              const rawFace = extractFace(lms, bs, w, h, nowMs);
              // Match nearest previously tracked face for silky smoothing
              let bestPrev: TrackedFace | null = null;
              let bestDist = Infinity;
              for (const pf of this.trackedFaces) {
                const d = Math.hypot(pf.noseTip.x - rawFace.noseTip.x, pf.noseTip.y - rawFace.noseTip.y);
                if (d < bestDist && d < w * 0.35) {
                  bestDist = d;
                  bestPrev = pf;
                }
              }
              return bestPrev ? smoothFace(bestPrev, rawFace) : rawFace;
            });
            this.trackedFaces = nextTracked;
          } else {
            // Smoothly fade out if face briefly turns away
            this.trackedFaces = this.trackedFaces
              .map((f) => ({ ...f, opacity: f.opacity - 0.08 }))
              .filter((f) => f.opacity > 0.02);
          }
        } catch {
          // ignore transient frame error
        }
      }

      const spawnParticle = (p: SparkParticle) => {
        if (this.particles.length < 48) {
          this.particles.push(p);
        }
      };

      for (const face of this.trackedFaces) {
        renderFaceMask(ctx, face, maskId, elapsedSec, spawnParticle);
      }
    }

    // 5. Render interactive smile/mouth-open reaction particles
    if (this.particles.length > 0) {
      const alive: SparkParticle[] = [];
      for (const p of this.particles) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx;
        p.y += p.vy;
        if (p.kind === 'confetti') p.vy += 0.09;
        p.rot += p.vRot;
        const fade = 1 - p.life / p.maxLife;
        if (p.kind === 'heart') {
          drawTinyHeart(ctx, p.x, p.y, p.size, p.color, p.alpha * fade);
        } else if (p.kind === 'star') {
          drawSparkleStar(ctx, p.x, p.y, p.size, p.color, p.alpha * fade);
        } else if (p.kind === 'butterfly') {
          drawButterfly(ctx, p.x, p.y, p.size, p.rot, p.life * 0.45, 0.8);
        } else if (p.kind === 'confetti') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = fade;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
          ctx.restore();
        }
        alive.push(p);
      }
      this.particles = alive;
    }

    // 6. Ambient atmospheric overlay (golden bokeh, petals, hearts, starry dream)
    drawMoodOverlay(ctx, w, h, moodId, elapsedSec);
  }
}
