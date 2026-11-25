import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe2,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Sparkles,
  User,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import type { FamilyMember } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';

interface GeoCoords {
  lat: number;
  lon: number;
  regionLabel: string;
  flag: string;
}

/** Approximate country/city-level coordinates ONLY — never exact addresses */
function getSafeRegionCoords(location: string): GeoCoords {
  const loc = location.toLowerCase();
  if (loc.includes('brasil') || loc.includes('brazil') || loc.includes('sao') || loc.includes('rio') || loc.includes('toledo') || loc.includes('parana') || loc.includes('paraná')) {
    return { lat: -15.8, lon: -47.9, regionLabel: 'Brasil', flag: '🇧🇷' };
  }
  if (loc.includes('cuba') || loc.includes('habana') || loc.includes('havana') || loc.includes('santiago de cuba')) {
    return { lat: 21.5, lon: -78.9, regionLabel: 'Cuba', flag: '🇨🇺' };
  }
  if (loc.includes('méxico') || loc.includes('mexico') || loc.includes('cdmx') || loc.includes('guadalajara') || loc.includes('monterrey') || loc.includes('canc')) {
    return { lat: 19.4, lon: -99.1, regionLabel: 'México', flag: '🇲🇽' };
  }
  if (loc.includes('madrid') || loc.includes('barcelona') || loc.includes('españa') || loc.includes('espana') || loc.includes('spain')) {
    return { lat: 40.4, lon: -3.7, regionLabel: 'España', flag: '🇪🇸' };
  }
  if (loc.includes('miami') || loc.includes('florida')) {
    return { lat: 25.8, lon: -80.2, regionLabel: 'EE. UU.', flag: '🇺🇸' };
  }
  if (loc.includes('estados unidos') || loc.includes('usa') || loc.includes('eeuu') || loc.includes('new york') || loc.includes('texas') || loc.includes('california')) {
    return { lat: 37.1, lon: -95.7, regionLabel: 'EE. UU.', flag: '🇺🇸' };
  }
  if (loc.includes('bogot') || loc.includes('colombia')) {
    return { lat: 4.7, lon: -74.1, regionLabel: 'Colombia', flag: '🇨🇴' };
  }
  if (loc.includes('medell')) {
    return { lat: 6.2, lon: -75.6, regionLabel: 'Colombia', flag: '🇨🇴' };
  }
  if (loc.includes('buenos aires') || loc.includes('argentina')) {
    return { lat: -34.6, lon: -58.4, regionLabel: 'Argentina', flag: '🇦🇷' };
  }
  if (loc.includes('chile') || loc.includes('santiago')) {
    return { lat: -33.4, lon: -70.6, regionLabel: 'Chile', flag: '🇨🇱' };
  }
  if (loc.includes('perú') || loc.includes('peru') || loc.includes('lima')) {
    return { lat: -12.0, lon: -77.0, regionLabel: 'Perú', flag: '🇵🇪' };
  }
  if (loc.includes('venezuela') || loc.includes('caracas')) {
    return { lat: 10.5, lon: -66.9, regionLabel: 'Venezuela', flag: '🇻🇪' };
  }
  if (loc.includes('uruguay') || loc.includes('montevideo')) {
    return { lat: -34.9, lon: -56.2, regionLabel: 'Uruguay', flag: '🇺🇾' };
  }
  if (loc.includes('paraguay') || loc.includes('asunci')) {
    return { lat: -25.3, lon: -57.6, regionLabel: 'Paraguay', flag: '🇵🇾' };
  }
  if (loc.includes('ecuador') || loc.includes('quito')) {
    return { lat: -0.2, lon: -78.5, regionLabel: 'Ecuador', flag: '🇪🇨' };
  }
  if (loc.includes('dominicana') || loc.includes('santo domingo')) {
    return { lat: 18.5, lon: -69.9, regionLabel: 'Rep. Dominicana', flag: '🇩🇴' };
  }
  if (loc.includes('portugal') || loc.includes('lisboa')) {
    return { lat: 38.7, lon: -9.1, regionLabel: 'Portugal', flag: '🇵🇹' };
  }
  if (loc.includes('italia') || loc.includes('roma') || loc.includes('milan')) {
    return { lat: 41.9, lon: 12.5, regionLabel: 'Italia', flag: '🇮🇹' };
  }
  if (loc.includes('francia') || loc.includes('paris')) {
    return { lat: 48.9, lon: 2.35, regionLabel: 'Francia', flag: '🇫🇷' };
  }
  if (loc.includes('canad') || loc.includes('toronto') || loc.includes('montreal')) {
    return { lat: 45.4, lon: -75.7, regionLabel: 'Canadá', flag: '🇨🇦' };
  }
  return { lat: -14.2, lon: -51.9, regionLabel: location || 'Nuestra Familia', flag: '💛' };
}

/** Convert (lat, lon) to unit 3D vector in planet space */
function latLonToVec3(lat: number, lon: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam)];
}

/** Exact 3D projection matching our WebGL Earth fragment shader */
function project3D(
  lat: number,
  lon: number,
  rotLon: number,
  rotLat: number,
  r: number,
  cx: number,
  cy: number,
  altitude = 1
) {
  const phi = (lat * Math.PI) / 180;
  const lam = ((lon - rotLon) * Math.PI) / 180;
  const tilt = (rotLat * Math.PI) / 180;

  const x0 = Math.cos(phi) * Math.sin(lam);
  const y0 = Math.sin(phi);
  const z0 = Math.cos(phi) * Math.cos(lam);

  const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
  const z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);

  return {
    x: cx + x0 * r * altitude,
    y: cy - y1 * r * altitude,
    z: z1,
    visible: z1 > 0.04,
  };
}

function projectVec3(
  vx: number,
  vy: number,
  vz: number,
  rotLon: number,
  rotLat: number,
  r: number,
  cx: number,
  cy: number,
  altitude = 1
) {
  const rotRad = (rotLon * Math.PI) / 180;
  const cosR = Math.cos(-rotRad);
  const sinR = Math.sin(-rotRad);
  const x0 = vx * cosR + vz * sinR;
  const z0 = -vx * sinR + vz * cosR;
  const y0 = vy;

  const tilt = (rotLat * Math.PI) / 180;
  const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
  const z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);

  return {
    x: cx + x0 * r * altitude,
    y: cy - y1 * r * altitude,
    z: z1,
  };
}

/* ======================== HARDWARE-ACCELERATED WebGL 3D EARTH SHADER ======================== */

const VERT_SRC = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;

varying vec2 vUv;
uniform vec2 uRes;
uniform float uRadius;
uniform float uRotLon;
uniform float uRotLat;
uniform float uTime;
uniform float uCloudOffset;
uniform sampler2D uEarthTex;
uniform sampler2D uCloudTex;
uniform float uHasTex;

const float PI = 3.14159265359;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 center = uRes * 0.5;
  vec2 rel = (px - center) / uRadius;
  float x1 = rel.x;
  float y1 = -rel.y;
  float r2 = x1 * x1 + y1 * y1;
  float dist = sqrt(r2);

  // Deep cosmic starry backdrop with subtle golden-sapphire nebula glow
  vec3 spaceCol = mix(vec3(0.024, 0.047, 0.105), vec3(0.012, 0.022, 0.052), clamp(dist * 0.55, 0.0, 1.0));
  spaceCol += vec3(0.14, 0.10, 0.025) * exp(-dist * dist * 1.1) * 0.35;

  // Multi-layer twinkling starfield
  vec2 starGrid = floor(px * 0.16);
  vec2 starLocal = fract(px * 0.16) - 0.5;
  float rnd = hash21(starGrid);
  if (rnd > 0.962) {
    float dStar = length(starLocal);
    float twinkle = 0.62 + 0.38 * sin(uTime * (2.0 + rnd * 4.5) + rnd * 60.0);
    float bright = smoothstep(0.24, 0.02, dStar) * twinkle;
    vec3 starTint = mix(vec3(0.82, 0.90, 1.0), vec3(1.0, 0.91, 0.68), fract(rnd * 27.0));
    spaceCol += starTint * bright * 0.92;
  }

  // Outer atmospheric Rayleigh blue + warm golden corona glow
  float outerGlow = exp(-max(dist - 0.985, 0.0) * 6.2);
  vec3 corona = mix(vec3(0.18, 0.56, 0.98), vec3(0.98, 0.80, 0.32), 0.24) * outerGlow * 0.72;
  spaceCol += corona;

  // Outside the planet sphere
  if (r2 > 1.0) {
    float edgeGlow = exp(-max(dist - 1.0, 0.0) * 28.0) * 0.65;
    vec3 col = spaceCol + vec3(0.42, 0.78, 1.0) * edgeGlow;
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  float z1 = sqrt(max(1.0 - r2, 0.0));
  vec3 N = normalize(vec3(x1, y1, z1));

  // Inverse X-axis tilt matching JS project3D exactly
  float cT = cos(uRotLat);
  float sT = sin(uRotLat);
  float x0 = x1;
  float y0 = y1 * cT + z1 * sT;
  float z0 = -y1 * sT + z1 * cT;

  float phi = asin(clamp(y0, -1.0, 1.0));
  float lam = atan(x0, z0);
  float lonRad = lam + uRotLon;

  float u = fract(lonRad / (2.0 * PI) + 0.5);
  float v = clamp(0.5 - phi / PI, 0.002, 0.998);

  vec4 earthTex = texture2D(uEarthTex, vec2(u, v));
  vec3 albedo = uHasTex > 0.5 ? earthTex.rgb : vec3(0.08, 0.28, 0.52);
  // Alpha stores [0.55..1.0] where ~0.55 = ocean, ~1.0 = land
  float isLand = smoothstep(0.68, 0.88, earthTex.a);
  float isOcean = 1.0 - isLand;

  // Subtle procedural micro-normal relief boost on continents for crisp 3D depth
  float eps = 0.0012;
  vec3 eR = texture2D(uEarthTex, vec2(fract(u + eps), v)).rgb;
  vec3 eU = texture2D(uEarthTex, vec2(u, clamp(v - eps, 0.002, 0.998))).rgb;
  float lumC = dot(albedo, vec3(0.3, 0.59, 0.11));
  float lumR = dot(eR, vec3(0.3, 0.59, 0.11));
  float lumU = dot(eU, vec3(0.3, 0.59, 0.11));
  vec3 bumpN = normalize(N + vec3((lumC - lumR) * 2.2 * isLand, (lumC - lumU) * 2.2 * isLand, 0.0));

  // Studio-warm 3D directional sunlight + subtle secondary bounce so Earth is vivid & legible
  vec3 sunDir = normalize(vec3(-0.46, 0.26, 0.85));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  float ndotl = dot(bumpN, sunDir);
  float dayFactor = smoothstep(-0.14, 0.28, ndotl);
  float diffuse = max(ndotl, 0.0);

  // Realistic ocean solar specular glint (glistens ONLY on ocean water, matte on land!)
  vec3 halfVec = normalize(sunDir + viewDir);
  float specBroad = pow(max(dot(N, halfVec), 0.0), 18.0) * 0.26;
  float specTight = pow(max(dot(N, halfVec), 0.0), 72.0) * 0.52;
  vec3 oceanSpec = vec3(1.0, 0.96, 0.84) * (specBroad + specTight) * isOcean * dayFactor;

  // Animated drifting volumetric cloud layer + subtle ground shadow underneath clouds
  float uCloud = fract(u - uCloudOffset);
  vec4 cloudSample = texture2D(uCloudTex, vec2(uCloud, v));
  float cloudMask = cloudSample.a * 0.78;
  float cloudShadow = texture2D(uCloudTex, vec2(fract(uCloud + 0.0045), clamp(v + 0.0035, 0.002, 0.998))).a * 0.34;

  // Day surface shading with cloud shadow & vibrant satellite color depth
  vec3 dayCol = albedo * (0.30 + 0.94 * diffuse) * (1.0 - cloudShadow) + oceanSpec;

  // Night side: deep cobalt ambient + sparkling warm golden coastal/city lights on land
  float cityNoise = hash21(floor(vec2(u * 280.0, v * 140.0)));
  float citySparkle = smoothstep(0.955, 0.995, cityNoise) * isLand * (1.0 - smoothstep(0.55, 0.78, abs(y0)));
  vec3 nightCol = albedo * vec3(0.11, 0.16, 0.28) + vec3(1.0, 0.82, 0.42) * citySparkle * 1.15;

  // Subtle warm golden sunset terminator transition band
  float twilight = exp(-pow((ndotl - 0.02) * 7.5, 2.0)) * 0.22;
  vec3 surfaceCol = mix(nightCol, dayCol, dayFactor) + vec3(0.95, 0.55, 0.22) * twilight * (1.0 - isOcean * 0.4);

  // Composite lit drifting white clouds over the surface
  float cloudLight = 0.24 + 0.88 * max(dot(N, sunDir), 0.0);
  vec3 cloudCol = mix(vec3(0.65, 0.76, 0.92), vec3(1.0, 0.99, 0.96), dayFactor) * cloudLight;
  surfaceCol = mix(surfaceCol, cloudCol, cloudMask);

  // Fresnel atmospheric Rayleigh scattering rim (signature 3D orb depth!)
  float fresnel = pow(1.0 - z1, 3.0);
  vec3 atmoColor = mix(vec3(0.28, 0.68, 1.0), vec3(1.0, 0.86, 0.48), 0.16);
  surfaceCol += atmoColor * fresnel * (0.48 + 0.52 * dayFactor);

  // Anti-aliased outer sphere edge blending cleanly into cosmic atmosphere
  float edgeAA = smoothstep(1.0, 0.985, dist);
  vec3 finalCol = mix(spaceCol + vec3(0.36, 0.74, 1.0) * 0.45, surfaceCol, edgeAA);

  gl_FragColor = vec4(finalCol, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export const FamilyWorldView: React.FC = () => {
  const { snapshot, currentUser, openChatWithMember, openProfile, startCall } = useFamilyApp();
  const { prefs, triggerFeedback } = useAppearance();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [webglReady, setWebglReady] = useState(true);

  const rotRef = useRef({
    lon: -56,
    lat: 10,
    velLon: 0.11,
    targetLon: null as number | null,
    targetLat: null as number | null,
  });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeMembers = useMemo(
    () => snapshot.members.filter((m) => m.status === 'ACTIVE'),
    [snapshot.members]
  );

  // Automatically de-overlap family members who share the exact same country coordinates!
  const memberGeos = useMemo(() => {
    const raw = activeMembers.map((m) => ({ member: m, base: getSafeRegionCoords(m.location) }));
    const groups = new Map<string, typeof raw>();
    raw.forEach((item) => {
      const key = `${item.base.lat.toFixed(1)},${item.base.lon.toFixed(1)}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });

    return raw.map((item) => {
      const key = `${item.base.lat.toFixed(1)},${item.base.lon.toFixed(1)}`;
      const peers = groups.get(key) ?? [item];
      if (peers.length === 1) {
        return { member: item.member, geo: item.base, anchor: item.base };
      }
      const idx = peers.findIndex((p) => p.member.id === item.member.id);
      const angle = (idx / peers.length) * Math.PI * 2 - Math.PI / 4;
      const spreadLon = 7.2 * Math.cos(angle);
      const spreadLat = 5.4 * Math.sin(angle);
      return {
        member: item.member,
        anchor: item.base,
        geo: {
          ...item.base,
          lat: Math.max(-75, Math.min(75, item.base.lat + spreadLat)),
          lon: item.base.lon + spreadLon,
        },
      };
    });
  }, [activeMembers]);

  const flyToLocation = useCallback((lat: number, lon: number) => {
    rotRef.current.targetLon = lon;
    rotRef.current.targetLat = Math.max(-42, Math.min(42, lat * 0.52));
    rotRef.current.velLon = 0;
  }, []);

  // Real-time 60 FPS WebGL 3D Earth + Elevated 3D Golden Great-Circle Arcs + Zero-Rerender Pins
  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    const ovCanvas = overlayCanvasRef.current;
    if (!glCanvas || !ovCanvas) return;

    const ovCtx = ovCanvas.getContext('2d');
    if (!ovCtx) return;

    const gl = glCanvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });

    let prog: WebGLProgram | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uRadius: WebGLUniformLocation | null = null;
    let uRotLon: WebGLUniformLocation | null = null;
    let uRotLat: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uCloudOffset: WebGLUniformLocation | null = null;
    let uHasTex: WebGLUniformLocation | null = null;
    let texLoaded = false;

    const setupTexture = (
      glCtx: WebGLRenderingContext,
      unit: number,
      src: string,
      onLoad?: () => void
    ) => {
      const tex = glCtx.createTexture();
      glCtx.activeTexture(glCtx.TEXTURE0 + unit);
      glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
      glCtx.texImage2D(
        glCtx.TEXTURE_2D,
        0,
        glCtx.RGBA,
        1,
        1,
        0,
        glCtx.RGBA,
        glCtx.UNSIGNED_BYTE,
        new Uint8Array([14, 52, 102, 140])
      );
      glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.REPEAT);
      glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
      glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.LINEAR);
      glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.LINEAR);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        glCtx.activeTexture(glCtx.TEXTURE0 + unit);
        glCtx.bindTexture(glCtx.TEXTURE_2D, tex);
        glCtx.pixelStorei(glCtx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
        glCtx.texImage2D(glCtx.TEXTURE_2D, 0, glCtx.RGBA, glCtx.RGBA, glCtx.UNSIGNED_BYTE, img);
        onLoad?.();
      };
      img.src = src;
      return tex;
    };

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
      if (vs && fs) {
        prog = gl.createProgram();
        if (prog) {
          gl.attachShader(prog, vs);
          gl.attachShader(prog, fs);
          gl.linkProgram(prog);
          if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            gl.useProgram(prog);
            const buf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
              gl.STATIC_DRAW
            );
            const aPos = gl.getAttribLocation(prog, 'aPos');
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            uRes = gl.getUniformLocation(prog, 'uRes');
            uRadius = gl.getUniformLocation(prog, 'uRadius');
            uRotLon = gl.getUniformLocation(prog, 'uRotLon');
            uRotLat = gl.getUniformLocation(prog, 'uRotLat');
            uTime = gl.getUniformLocation(prog, 'uTime');
            uCloudOffset = gl.getUniformLocation(prog, 'uCloudOffset');
            uHasTex = gl.getUniformLocation(prog, 'uHasTex');

            gl.uniform1i(gl.getUniformLocation(prog, 'uEarthTex'), 0);
            gl.uniform1i(gl.getUniformLocation(prog, 'uCloudTex'), 1);
            setupTexture(gl, 0, './textures/earth-day.webp', () => {
              texLoaded = true;
            });
            setupTexture(gl, 1, './textures/earth-clouds.webp');
            setWebglReady(true);
          } else {
            prog = null;
            setWebglReady(false);
          }
        }
      }
    } else {
      setWebglReady(false);
    }

    let rafId = 0;
    const startMs = performance.now();

    const render = (nowMs: number) => {
      const elapsedSec = (nowMs - startMs) * 0.001;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = ovCanvas.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (ovCanvas.width !== targetW || ovCanvas.height !== targetH) {
        ovCanvas.width = targetW;
        ovCanvas.height = targetH;
      }
      if (glCanvas.width !== targetW || glCanvas.height !== targetH) {
        glCanvas.width = targetW;
        glCanvas.height = targetH;
      }

      // Smooth spring fly-to target OR gentle inertial auto-spin
      const rot = rotRef.current;
      if (!dragRef.current.active) {
        if (rot.targetLon !== null && rot.targetLat !== null) {
          let dLon = ((rot.targetLon - rot.lon + 540) % 360) - 180;
          const dLat = rot.targetLat - rot.lat;
          rot.lon += dLon * 0.1;
          rot.lat += dLat * 0.1;
          if (Math.abs(dLon) < 0.25 && Math.abs(dLat) < 0.25) {
            rot.targetLon = null;
            rot.targetLat = null;
            rot.velLon = 0.08;
          }
        } else if (prefs.animationsEnabled && prefs.mode !== 'LIGHT') {
          rot.lon += rot.velLon;
          rot.velLon += (0.09 - rot.velLon) * 0.035;
        }
      }

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.415 * zoom;

      // 1. Render photorealistic WebGL 3D Planet Earth
      if (gl && prog) {
        gl.viewport(0, 0, targetW, targetH);
        gl.uniform2f(uRes, targetW, targetH);
        gl.uniform1f(uRadius, radius * dpr);
        gl.uniform1f(uRotLon, (rot.lon * Math.PI) / 180);
        gl.uniform1f(uRotLat, (rot.lat * Math.PI) / 180);
        gl.uniform1f(uTime, elapsedSec);
        gl.uniform1f(uCloudOffset, (elapsedSec * 0.0055) % 1.0);
        gl.uniform1f(uHasTex, texLoaded ? 1.0 : 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // 2. Render 3D elevated golden great-circle arcs + pulsing beacon rings + traveling sparks
      ovCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ovCtx.clearRect(0, 0, w, h);

      // Draw graceful 3D elevated arcs between unique family regions
      if (memberGeos.length >= 2) {
        const hubAnchor = memberGeos[0].anchor;
        const vA = latLonToVec3(hubAnchor.lat, hubAnchor.lon);
        const drawnTargets = new Set<string>();

        memberGeos.slice(1).forEach(({ anchor }, idx) => {
          const targetKey = `${anchor.lat.toFixed(1)},${anchor.lon.toFixed(1)}`;
          if (
            targetKey === `${hubAnchor.lat.toFixed(1)},${hubAnchor.lon.toFixed(1)}` ||
            drawnTargets.has(targetKey)
          ) {
            return;
          }
          drawnTargets.add(targetKey);

          const vB = latLonToVec3(anchor.lat, anchor.lon);
          const dot = Math.max(-0.999, Math.min(0.999, vA[0] * vB[0] + vA[1] * vB[1] + vA[2] * vB[2]));
          const omega = Math.acos(dot);
          const sinOmega = Math.sin(omega) || 1;
          const peakAlt = 1.0 + Math.min(0.28, omega * 0.16);
          const steps = 36;

          const pts: { x: number; y: number; z: number }[] = [];
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const wA = Math.sin((1 - t) * omega) / sinOmega;
            const wB = Math.sin(t * omega) / sinOmega;
            const vx = vA[0] * wA + vB[0] * wB;
            const vy = vA[1] * wA + vB[1] * wB;
            const vz = vA[2] * wA + vB[2] * wB;
            const alt = 1.0 + Math.sin(t * Math.PI) * (peakAlt - 1.0);
            pts.push(projectVec3(vx, vy, vz, rot.lon, rot.lat, radius, cx, cy, alt));
          }

          // Luminous golden thread arc (only draw visible front-hemisphere segments)
          ovCtx.save();
          ovCtx.lineCap = 'round';
          for (let s = 0; s < steps; s++) {
            const p0 = pts[s];
            const p1 = pts[s + 1];
            if (p0.z < -0.08 && p1.z < -0.08) continue;
            const alpha = Math.max(0.15, Math.min(1, (Math.min(p0.z, p1.z) + 0.15) * 1.4));
            ovCtx.beginPath();
            ovCtx.moveTo(p0.x, p0.y);
            ovCtx.lineTo(p1.x, p1.y);
            ovCtx.strokeStyle = `rgba(255, 224, 114, ${alpha * 0.85})`;
            ovCtx.lineWidth = 2.2;
            ovCtx.shadowColor = 'rgba(255, 212, 74, 0.85)';
            ovCtx.shadowBlur = 8;
            ovCtx.stroke();
          }

          // Animated golden shooting comet gliding smoothly along the 3D arc!
          const sparkT = (elapsedSec * 0.36 + idx * 0.37) % 1;
          const sparkIdx = Math.min(steps - 1, Math.floor(sparkT * steps));
          const sp = pts[sparkIdx];
          if (sp.z > 0.0) {
            const grad = ovCtx.createRadialGradient(sp.x, sp.y, 0.5, sp.x, sp.y, 9);
            grad.addColorStop(0, 'rgba(255, 254, 232, 1)');
            grad.addColorStop(0.4, 'rgba(255, 218, 88, 0.92)');
            grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ovCtx.fillStyle = grad;
            ovCtx.beginPath();
            ovCtx.arc(sp.x, sp.y, 9, 0, Math.PI * 2);
            ovCtx.fill();
          }
          ovCtx.restore();
        });
      }

      // Draw pulsing golden radar beacon rings on the planet surface & position DOM pins cleanly (0 React re-renders!)
      memberGeos.forEach(({ member, geo }, idx) => {
        const p = project3D(geo.lat, geo.lon, rot.lon, rot.lat, radius, cx, cy, 1.01);
        const el = pinElsRef.current.get(member.id);

        if (p.z > 0.06) {
          // Expanding golden pulse ring on the Earth's surface
          const pulse = (elapsedSec * 0.7 + idx * 0.28) % 1;
          ovCtx.save();
          ovCtx.beginPath();
          ovCtx.arc(p.x, p.y, 5 + pulse * 18, 0, Math.PI * 2);
          ovCtx.strokeStyle = `rgba(255, 224, 118, ${(1 - pulse) * 0.72})`;
          ovCtx.lineWidth = 1.6;
          ovCtx.stroke();
          ovCtx.restore();

          if (el) {
            const depthScale = 0.84 + Math.min(0.22, p.z * 0.22);
            el.style.opacity = String(Math.min(1, (p.z - 0.06) * 4.5));
            el.style.pointerEvents = 'auto';
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${depthScale})`;
            el.style.zIndex = String(Math.round(20 + p.z * 20));
          }
        } else if (el) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        }
      });

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(rafId);
  }, [memberGeos, zoom, prefs.animationsEnabled, prefs.mode]);

  if (!currentUser) return null;

  const selectedMember =
    activeMembers.find((m) => m.id === selectedMemberId) ?? activeMembers[0];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero Section: Real-Time 3D Interactive Planet Earth */}
      <div className="card-crochet overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1 text-[11px] font-bold text-solar-300">
              <Globe2 className="h-3.5 w-3.5" /> Planeta 3D en vivo
            </span>
            <h2 className="mt-1.5 font-editorial text-2xl font-bold text-forest-900 sm:text-3xl">
              Nuestra familia conectada en el planeta 🇧🇷✨
            </h2>
            <p className="mt-0.5 text-xs text-espresso-700 sm:text-sm">
              Gira la Tierra en 3D con relieve real, nubes en movimiento y toca a cualquier familiar para
              volar hasta su país.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))));
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Alejar planeta"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.min(1.38, Number((z + 0.15).toFixed(2))));
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Acercar planeta"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                flyToLocation(-15.8, -47.9);
                setZoom(1);
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Centrar globo en América"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3D Planet Stage + Selected Member Card */}
        <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
          {/* Interactive Photorealistic WebGL 3D Earth */}
          <div
            className="relative h-[350px] w-full cursor-grab touch-none overflow-hidden rounded-3xl border border-solar-300/80 bg-[#040B1A] shadow-[0_20px_50px_-14px_rgba(4,12,32,0.75)] active:cursor-grabbing sm:h-[420px] lg:col-span-7"
            onPointerDown={(e) => {
              rotRef.current.targetLon = null;
              rotRef.current.targetLat = null;
              dragRef.current = { active: true, x: e.clientX, y: e.clientY };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.x;
              const dy = e.clientY - dragRef.current.y;
              rotRef.current.lon -= dx * 0.42;
              rotRef.current.lat = Math.max(-55, Math.min(55, rotRef.current.lat + dy * 0.34));
              rotRef.current.velLon = -dx * 0.065;
              dragRef.current.x = e.clientX;
              dragRef.current.y = e.clientY;
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
            onPointerCancel={() => {
              dragRef.current.active = false;
            }}
          >
            {/* Layer 1: GPU WebGL 3D Photorealistic Earth with Relief, Ocean Glint, Clouds & Atmosphere */}
            <canvas ref={glCanvasRef} className="absolute inset-0 h-full w-full" />

            {/* Layer 2: 3D Elevated Golden Arcs, Traveling Light Sparks & Pulsing Beacons */}
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />

            {/* Layer 3: Clickable Family Avatar Pins (de-overlapped & smoothly projected at 60 FPS) */}
            {memberGeos.map(({ member, geo }) => (
              <button
                key={member.id}
                ref={(node) => {
                  if (node) pinElsRef.current.set(member.id, node);
                  else pinElsRef.current.delete(member.id);
                }}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFeedback('tap');
                  setSelectedMemberId(member.id);
                  flyToLocation(geo.lat, geo.lon);
                }}
                style={{
                  left: 0,
                  top: 0,
                  opacity: 0,
                  willChange: 'transform, opacity',
                }}
                className="absolute flex flex-col items-center transition-[filter] hover:brightness-110"
              >
                <div
                  className={`rounded-full p-0.5 shadow-[0_6px_18px_rgba(0,0,0,0.55)] ${
                    selectedMember?.id === member.id
                      ? 'bg-solar-300 ring-2 ring-white'
                      : 'bg-white/95 ring-2 ring-solar-300/90'
                  }`}
                >
                  <MemberAvatar member={member} size="xs" showPresence />
                </div>
                <span className="mt-0.5 whitespace-nowrap rounded-full border border-solar-300/80 bg-[#07152B]/85 px-2 py-0.5 text-[10px] font-bold text-solar-200 shadow-md backdrop-blur-md">
                  {geo.flag} {member.name.split(' ')[0]}
                </span>
              </button>
            ))}

            {/* Top-left Live 3D badge */}
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-solar-300/70 bg-[#07152B]/70 px-2.5 py-1 text-[10px] font-bold text-solar-200 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-solar-300" />
              {webglReady ? 'Tierra 3D HD · Nubes en vivo' : 'Globo 3D Interactivo'}
            </span>

            <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-solar-300/70 bg-[#07152B]/75 px-3.5 py-1 text-[11px] font-semibold text-solar-100 shadow-md backdrop-blur-md">
              👆 Arrastra para girar el planeta 3D
            </span>
          </div>

          {/* Authorized Selected Family Member Card */}
          {selectedMember && (
            <div className="crochet-parchment rounded-3xl p-5 lg:col-span-5">
              <div className="flex items-center gap-3.5">
                <div className="crochet-avatar-ring rounded-full">
                  <MemberAvatar member={selectedMember} size="lg" showPresence />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-editorial text-2xl font-bold text-forest-900">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs font-bold text-brazil-600">{selectedMember.relationship}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-espresso-700">
                    <MapPin className="h-3.5 w-3.5 text-forest-700" />
                    {getSafeRegionCoords(selectedMember.location).flag}{' '}
                    {getSafeRegionCoords(selectedMember.location).regionLabel}
                  </p>
                </div>
              </div>

              <p className="liquid-glass-pill mt-3.5 rounded-2xl p-3 text-sm leading-relaxed text-espresso-900">
                {selectedMember.bio}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    openChatWithMember(selectedMember.id);
                  }}
                  className="crochet-green-3d btn-yarn-press flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl text-xs font-bold text-white"
                >
                  <MessageCircle className="h-4 w-4 text-solar-300" />
                  Enviar mensaje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    startCall({
                      mode: 'VIDEO',
                      scope: 'DIRECT',
                      title: selectedMember.name,
                      participantIds: [currentUser.id, selectedMember.id],
                    });
                  }}
                  className="crochet-gold-3d btn-yarn-press flex min-h-[46px] items-center justify-center gap-1.5 rounded-2xl text-xs font-bold text-forest-900"
                >
                  <Video className="h-4 w-4" />
                  Videollamar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    startCall({
                      mode: 'AUDIO',
                      scope: 'DIRECT',
                      title: selectedMember.name,
                      participantIds: [currentUser.id, selectedMember.id],
                    });
                  }}
                  className="liquid-glass-pill btn-yarn-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl text-xs font-bold text-forest-900"
                >
                  <Phone className="h-4 w-4 text-forest-700" />
                  Llamada de voz
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    openProfile(selectedMember.id);
                  }}
                  className="liquid-glass-pill btn-yarn-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl text-xs font-bold text-espresso-900"
                >
                  <User className="h-4 w-4 text-artisanal-600" />
                  Ver perfil
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Accessible Full Family Directory Grid */}
      <div className="card-crochet rounded-3xl p-5">
        <h3 className="font-editorial text-xl font-bold text-forest-900">
          Toda la familia ({activeMembers.length})
        </h3>
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {memberGeos.map(({ member, geo }) => (
            <div
              key={member.id}
              className="liquid-glass-pill flex items-center justify-between gap-2.5 rounded-2xl p-3 transition hover:brightness-105"
            >
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setSelectedMemberId(member.id);
                  flyToLocation(geo.lat, geo.lon);
                }}
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <MemberAvatar member={member} size="md" showPresence />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-espresso-900">{member.name}</p>
                  <p className="truncate text-xs text-espresso-700">
                    {member.relationship} · {geo.flag} {geo.regionLabel}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openChatWithMember(member.id)}
                  className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700/15 text-forest-900 hover:bg-forest-700/25"
                  title={`Mensaje a ${member.name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openProfile(member.id)}
                  className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl bg-solar-400/35 text-forest-900 hover:bg-solar-400/55"
                  title={`Ver perfil de ${member.name}`}
                >
                  <User className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
