import React, { useEffect, useRef } from 'react';

// Palm centers measured from the forward half of the 834 × 1112 video.
// The second half runs in reverse, so both directions share the same landmarks.
const palmTrack = [
  [0, .207, .763, .795, .757],
  [.5, .217, .769, .783, .771],
  [1, .230, .765, .781, .765],
  [1.5, .235, .763, .781, .764],
  [2, .222, .700, .797, .695],
  [2.5, .206, .686, .817, .687],
  [3, .177, .732, .832, .752],
  [3.5, .158, .779, .850, .793],
  [4, .165, .808, .857, .819],
  [4.5, .177, .812, .856, .831],
  [5, .188, .821, .853, .831],
  [5.37, .191, .823, .854, .832],
];

function trackedPalms(seconds: number) {
  const forward = Math.min(seconds, 322 / 30 - seconds);
  const next = palmTrack.findIndex(([time]) => time > forward);
  if (next <= 0) return palmTrack[next === 0 ? 0 : palmTrack.length - 1].slice(1);
  const [start, ...from] = palmTrack[next - 1];
  const [end, ...to] = palmTrack[next];
  const m = (forward - start) / (end - start);
  return from.map((value, i) => value + (to[i] - value) * m);
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  ttl: number;
  size: number;
  angle: number;
  diamond: boolean;
}

export function TarotPalmLights({ videoRef, burst }: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  burst: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstRef = useRef(0);

  useEffect(() => {
    if (burst > 0) burstRef.current = performance.now();
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !video || !ctx) return;
    let frame = 0;
    let lastFrame = 0;
    let lastSpawn = 0;
    let width = 0;
    let height = 0;
    let scale = 1;
    let sparks: Spark[] = [];

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      sparks = [];
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (!video.videoWidth || !width || !height || now - lastFrame < 14) return;
      const delta = Math.min((now - lastFrame) / 1000, .045);
      lastFrame = now;
      const fit = Math.max(width / video.videoWidth, height / video.videoHeight);
      const videoW = video.videoWidth * fit;
      const videoH = video.videoHeight * fit;
      // Matches object-fit: cover and object-position: center 24% on the reader.
      const offsetX = (width - videoW) / 2;
      const offsetY = (height - videoH) * .24;
      const [lx, ly, rx, ry] = trackedPalms(video.currentTime);
      const recent = burstRef.current ? Math.max(0, 1 - (now - burstRef.current) / 1150) : 0;
      const palms = [[lx, ly], [rx, ry]];
      const u = Math.max(.65, width / 570);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      for (const [px, py] of palms) {
        const x = offsetX + px * videoW;
        const y = offsetY + py * videoH;
        const flicker = .88 + .12 * Math.sin(now / 145 + px * 8);
        const radius = (22 + 26 * recent) * u;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, `rgba(255,235,178,${(.25 + .53 * recent) * flicker})`);
        glow.addColorStop(.22, `rgba(255,178,68,${.19 + .24 * recent})`);
        glow.addColorStop(.62, 'rgba(229,103,25,.07)');
        glow.addColorStop(1, 'rgba(229,103,25,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

        if (now - lastSpawn > (recent > .1 ? 27 : 105) && sparks.length < 100) {
          const angle = Math.random() * Math.PI * 2;
          const velocity = (8 + Math.random() * (26 + 35 * recent)) * u;
          sparks.push({
            x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 12 * u,
            born: now, ttl: 550 + Math.random() * 850, size: (.7 + Math.random() * 2.3) * u,
            angle, diamond: Math.random() > .62,
          });
        }
      }
      if (now - lastSpawn > (recent > .1 ? 27 : 105)) lastSpawn = now;

      sparks = sparks.filter((spark) => now - spark.born < spark.ttl);
      for (const spark of sparks) {
        const life = (now - spark.born) / spark.ttl;
        const alpha = Math.min(1, life * 8) * (1 - life) ** 1.5;
        spark.x += spark.vx * delta;
        spark.y += spark.vy * delta;
        spark.vy += delta * 13 * u;
        ctx.save();
        ctx.translate(spark.x, spark.y);
        ctx.rotate(spark.angle + life * .85);
        ctx.fillStyle = `rgba(255,222,145,${alpha})`;
        ctx.shadowColor = '#ffb862';
        ctx.shadowBlur = spark.size * 2;
        ctx.beginPath();
        if (spark.diamond) {
          const r = spark.size * 2;
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(r * .18, -r * .20, r, 0);
          ctx.quadraticCurveTo(r * .18, r * .20, 0, r);
          ctx.quadraticCurveTo(-r * .18, r * .20, -r, 0);
          ctx.quadraticCurveTo(-r * .18, -r * .20, 0, -r);
        } else {
          ctx.arc(0, 0, spark.size * .55, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [videoRef]);

  return <canvas ref={canvasRef} className="tarot-palm-canvas" aria-hidden="true" />;
}
