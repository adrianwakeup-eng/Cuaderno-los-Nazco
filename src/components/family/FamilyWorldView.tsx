import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Compass,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Sparkles,
  Sun,
  User,
  Video,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { MemberAvatar } from '../auth/FamilyAuthModal';

import { normalizeRegion, parseMemberLocation, provinceCoordinates } from '../../data/memberLocation';

interface GeoCoords {
  lat: number;
  lon: number;
  regionLabel: string;
  flag: string;
}

/** Approximate country/city-level coordinates ONLY — never exact addresses */
function getSafeRegionCoords(location: string): GeoCoords | null {
  const { province, country } = parseMemberLocation(location);
  const rawCountry = normalizeRegion(country);
  const loc = rawCountry === 'brazil' ? 'brasil' : rawCountry;
  const regional = provinceCoordinates[loc]?.[normalizeRegion(province)];
  if (regional) {
    return { lat: regional[0], lon: regional[1], regionLabel: `${province}, ${country}`,
      flag: loc === 'cuba' ? '🇨🇺' : '🇧🇷' };
  }
  if (!loc) return null;
  if (
    loc.includes('brasil') ||
    loc.includes('brazil') ||
    loc.includes('sao') ||
    loc.includes('rio') ||
    loc.includes('toledo') ||
    loc.includes('parana') ||
    loc.includes('paraná')
  ) {
    return { lat: -15.8, lon: -47.9, regionLabel: 'Brasil', flag: '🇧🇷' };
  }
  if (
    loc.includes('cuba') ||
    loc.includes('habana') ||
    loc.includes('havana') ||
    loc.includes('santiago de cuba')
  ) {
    return { lat: 21.5, lon: -78.9, regionLabel: 'Cuba', flag: '🇨🇺' };
  }
  if (
    loc.includes('méxico') ||
    loc.includes('mexico') ||
    loc.includes('cdmx') ||
    loc.includes('guadalajara') ||
    loc.includes('monterrey') ||
    loc.includes('canc')
  ) {
    return { lat: 19.4, lon: -99.1, regionLabel: 'México', flag: '🇲🇽' };
  }
  if (
    loc.includes('madrid') ||
    loc.includes('barcelona') ||
    loc.includes('españa') ||
    loc.includes('espana') ||
    loc.includes('spain')
  ) {
    return { lat: 40.4, lon: -3.7, regionLabel: 'España', flag: '🇪🇸' };
  }
  if (loc.includes('miami') || loc.includes('florida')) {
    return { lat: 25.8, lon: -80.2, regionLabel: 'EE. UU.', flag: '🇺🇸' };
  }
  if (
    loc.includes('estados unidos') ||
    loc.includes('usa') ||
    loc.includes('eeuu') ||
    loc.includes('new york') ||
    loc.includes('texas') ||
    loc.includes('california')
  ) {
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
  return null;
}

/* ======================== SHARED 3D FLAT-EARTH CAMERA MATH ======================== */

const FOV_F = 1.55;
const BASE_CAM_DIST = 2.42;
const MIN_ZOOM = 0.76;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.3;

const MARINE_LIFE = [
  { kind: 'dolphin', radius: 1.12, phase: 0.1, speed: 0.24, length: 0.15 },
  { kind: 'dolphin', radius: 1.19, phase: 0.27, speed: 0.24, length: 0.13 },
  { kind: 'dolphin', radius: 1.26, phase: 0.44, speed: 0.24, length: 0.14 },
  { kind: 'whale', radius: 1.23, phase: 2.4, speed: -0.12, length: 0.30 },
  { kind: 'whale', radius: 1.35, phase: 5.0, speed: -0.10, length: 0.26 },
] as const;
const ORBIT_RADIUS = 0.51;
const ORBIT_ALTITUDE = 0.35;
const ORBIT_SPEED = 0.24; // radians/sec (~26s full day-night cycle)

/** Convert (lat, lon) to Flat Earth disc-local coordinates (x, 0, z) with North Pole at (0,0) */
function latLonToFlatLocal(lat: number, lon: number): [number, number] {
  const r = Math.max(0.001, Math.min(0.95, (90 - lat) / 180));
  const lonRad = (lon * Math.PI) / 180;
  return [r * Math.sin(lonRad), r * Math.cos(lonRad)];
}

/** Exact 3D perspective projection matching our WebGL Flat Earth + Ocean + Sun/Moon shader */
function projectFlat3D(
  lx: number,
  ly: number,
  lz: number,
  yawDeg: number,
  pitchDeg: number,
  camDist: number,
  w: number,
  h: number,
  magnification: number
) {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // Rotate disc-local point around Y by +yaw into camera-aligned world space
  const wx = lx * cosY + lz * sinY;
  const wy = ly;
  const wz = -lx * sinY + lz * cosY;

  // Vector from camera (0, D*sinP, D*cosP) to point W
  const rx = wx;
  const ry = wy - camDist * sinP;
  const rz = wz - camDist * cosP;

  // Project onto camera basis: R=(1,0,0), U=(0,cosP,-sinP), F=(0,-sinP,-cosP)
  const cxCam = rx;
  const cyCam = ry * cosP - rz * sinP;
  const czCam = -ry * sinP - rz * cosP;

  const scale = 0.5 * Math.min(w, h) * magnification;
  const safeZ = Math.max(0.08, czCam);
  const ndcX = (cxCam / safeZ) * FOV_F;
  const ndcY = (cyCam / safeZ) * FOV_F;

  return {
    x: 0.5 * w + ndcX * scale,
    y: 0.5 * h - ndcY * scale,
    depth: czCam,
    visible: czCam > 0.15,
  };
}

function drawMarineAnimal(ctx: CanvasRenderingContext2D, whale: boolean, tailMotion: number) {
  // The animal faces right in canvas coordinates. The caller projects its heading onto the water.
  ctx.fillStyle = 'rgba(199, 247, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-0.43, 0.15, 0.29, 0.065, -0.06, 0, Math.PI * 2);
  ctx.fill();

  const back = ctx.createLinearGradient(0, -0.24, 0, 0.15);
  back.addColorStop(0, whale ? '#4389a2' : '#7cc4d6');
  back.addColorStop(0.58, whale ? '#23536d' : '#376e87');
  back.addColorStop(1, whale ? '#9ac8cf' : '#d4eef1');
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.moveTo(-0.40, -0.01);
  ctx.bezierCurveTo(-0.23, -0.03, -0.16, -0.13, -0.06, -0.13);
  ctx.quadraticCurveTo(-0.11, -0.25, whale ? -0.15 : -0.03, whale ? -0.21 : -0.25);
  ctx.quadraticCurveTo(0.03, -0.23, 0.07, -0.14);
  ctx.bezierCurveTo(0.38, -0.18, 0.52, -0.08, whale ? 0.52 : 0.47, 0.01);
  if (!whale) ctx.quadraticCurveTo(0.60, 0.04, 0.49, 0.07);
  ctx.bezierCurveTo(0.30, 0.14, 0.13, 0.15, 0.03, 0.10);
  ctx.quadraticCurveTo(-0.18, 0.28, -0.16, 0.14);
  ctx.lineTo(-0.10, 0.07);
  ctx.quadraticCurveTo(-0.31, 0.05, -0.40, -0.01);
  ctx.fill();

  ctx.fillStyle = whale ? '#376e87' : '#5795ab';
  ctx.beginPath();
  ctx.moveTo(-0.38, -0.01);
  ctx.quadraticCurveTo(-0.49, -0.14 + tailMotion, -0.65, -0.14 + tailMotion);
  ctx.quadraticCurveTo(-0.60, -0.02, -0.52, 0.01);
  ctx.quadraticCurveTo(-0.63, 0.07, -0.64, 0.13 + tailMotion);
  ctx.quadraticCurveTo(-0.49, 0.12 + tailMotion, -0.38, -0.01);
  ctx.fill();
}

/* ======================== HARDWARE-ACCELERATED WebGL FLAT EARTH + OCEAN + SUN & MOON SHADER ======================== */

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
uniform float uYaw;
uniform float uPitch;
uniform float uCamDist;
uniform float uMagnification;
uniform float uTime;
uniform float uCloudOffset;
uniform float uSunAngle;
uniform sampler2D uEarthTex;
uniform sampler2D uCloudTex;
uniform float uHasTex;

const float PI = 3.14159265359;
const float FOV_F = 1.55;
const float ORBIT_R = 0.51;
const float ORBIT_Y = 0.35;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float oceanWaveHeight(vec2 p, float t) {
  float w = 0.0;
  w += sin(p.x * 5.8 + p.y * 3.4 + t * 1.45) * 0.34;
  w += sin(p.x * -4.2 + p.y * 6.5 - t * 1.15) * 0.26;
  w += (vnoise(p * 4.5 + vec2(t * 0.42, -t * 0.28)) - 0.5) * 0.48;
  w += (vnoise(p * 11.5 - vec2(t * 0.72, t * 0.55)) - 0.5) * 0.24;
  return w;
}

vec3 oceanNormal(vec2 p, float t, float strength) {
  float eps = 0.018;
  float hC = oceanWaveHeight(p, t);
  float hX = oceanWaveHeight(p + vec2(eps, 0.0), t);
  float hZ = oceanWaveHeight(p + vec2(0.0, eps), t);
  return normalize(vec3((hC - hX) * strength, 1.0, (hC - hZ) * strength));
}

// Analytic ray-sphere intersection: returns nearest positive t or -1.0
float intersectSphere(vec3 ro, vec3 rd, vec3 center, float rad) {
  vec3 oc = ro - center;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - rad * rad;
  float h = b * b - c;
  if (h < 0.0) return -1.0;
  float t = -b - sqrt(h);
  return t > 0.0 ? t : -1.0;
}

// Distance from ray (ro + t*rd, t>=0) to point p, plus along-ray parameter t
vec2 rayPointDist(vec3 ro, vec3 rd, vec3 p) {
  float t = max(dot(p - ro, rd), 0.0);
  vec3 closest = ro + rd * t;
  return vec2(length(p - closest), t);
}

vec3 rotY(vec3 v, float a) {
  float c = cos(a);
  float s = sin(a);
  return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c);
}

void main() {
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float scale = 0.5 * min(uRes.x, uRes.y);
  vec2 ndc = vec2((px.x - 0.5 * uRes.x) / scale, (0.5 * uRes.y - px.y) / scale);

  float cosP = cos(uPitch);
  float sinP = sin(uPitch);
  vec3 camPos = vec3(0.0, uCamDist * sinP, uCamDist * cosP);
  vec3 camRight = vec3(1.0, 0.0, 0.0);
  vec3 camUp = vec3(0.0, cosP, -sinP);
  vec3 camFwd = vec3(0.0, -sinP, -cosP);
  vec3 rd = normalize(camRight * ndc.x + camUp * ndc.y + camFwd * (FOV_F * uMagnification));

  // Orbiting 3D Sun & Moon in disc-local space, then rotated into camera-world space by +uYaw
  float sunBob = sin(uSunAngle * 0.5) * 0.045;
  vec3 sunLocal = vec3(sin(uSunAngle) * (ORBIT_R + sunBob), ORBIT_Y, cos(uSunAngle) * (ORBIT_R + sunBob));
  vec3 moonLocal = vec3(sin(uSunAngle + PI) * (ORBIT_R - sunBob), ORBIT_Y, cos(uSunAngle + PI) * (ORBIT_R - sunBob));
  vec3 sunPos = rotY(sunLocal, uYaw);
  vec3 moonPos = rotY(moonLocal, uYaw);

  // Sky / oceanic horizon backdrop (only seen when camera tilts low toward the horizon)
  float skyGrad = clamp(rd.y * 2.4, 0.0, 1.0);
  vec3 horizonCol = vec3(0.11, 0.34, 0.56);
  vec3 zenithCol = vec3(0.025, 0.085, 0.21);
  vec3 col = mix(horizonCol, zenithCol, pow(max(skyGrad, 0.0001), 0.65));

  // Subtle sun-side warm glow & stars in high sky
  float sunSkyAlign = max(dot(rd, normalize(sunPos - camPos)), 0.0);
  col += vec3(1.0, 0.78, 0.38) * pow(max(sunSkyAlign, 0.0001), 8.0) * 0.35;
  if (rd.y > 0.05) {
    vec2 sg = floor(px * 0.14);
    vec2 sl = fract(px * 0.14) - 0.5;
    float rnd = hash21(sg);
    if (rnd > 0.968) {
      float tw = 0.6 + 0.4 * sin(uTime * (2.2 + rnd * 3.5) + rnd * 45.0);
      col += vec3(0.88, 0.94, 1.0) * smoothstep(0.24, 0.02, length(sl)) * tw * smoothstep(0.05, 0.28, rd.y) * 0.7;
    }
  }

  float hitDepth = 1e6;

  // Intersect infinite horizontal ocean + Flat Earth disc plane (y = 0)
  if (rd.y < -0.0012) {
    float tPlane = -camPos.y / rd.y;
    hitDepth = tPlane;
    vec3 hitW = camPos + rd * tPlane;

    // Transform hit point into disc-local space (rotate by -uYaw)
    float cosY = cos(uYaw);
    float sinY = sin(uYaw);
    vec2 localXZ = vec2(hitW.x * cosY - hitW.z * sinY, hitW.x * sinY + hitW.z * cosY);
    float r = length(localXZ);

    // Distance-based wave falloff so far horizon ocean never aliases
    float distFade = exp(-tPlane * 0.045);

    // Vector & lighting from orbiting 3D Sun and Moon onto this plane point
    vec3 toSun = sunPos - hitW;
    float dSun = length(toSun);
    vec3 sunDir = toSun / max(dSun, 0.001);
    float sunSpot = smoothstep(1.38, 0.14, dSun);
    float sunCoreGlow = exp(-dSun * dSun * 1.45);

    vec3 toMoon = moonPos - hitW;
    float dMoon = length(toMoon);
    vec3 moonDir = toMoon / max(dMoon, 0.001);
    float moonSpot = smoothstep(1.25, 0.18, dMoon);

    vec3 viewDir = -rd;

    if (r <= 1.0) {
      // ================= INSIDE THE FLAT EARTH DISC =================
      float lonRad = atan(localXZ.x, localXZ.y);
      float u = fract(lonRad / (2.0 * PI) + 0.5);
      float v = clamp(r, 0.002, 0.998);

      vec4 earthTex = texture2D(uEarthTex, vec2(u, v));
      vec3 albedo = uHasTex > 0.5 ? earthTex.rgb : vec3(0.08, 0.30, 0.54);
      float isLand = smoothstep(0.68, 0.88, earthTex.a);
      float isOcean = 1.0 - isLand;

      // Crisp 3D continental mountain/coastline relief normal
      float eps = 0.0014;
      vec3 eR = texture2D(uEarthTex, vec2(fract(u + eps), v)).rgb;
      vec3 eD = texture2D(uEarthTex, vec2(u, clamp(v + eps, 0.002, 0.998))).rgb;
      float lumC = dot(albedo, vec3(0.3, 0.59, 0.11));
      float lumR = dot(eR, vec3(0.3, 0.59, 0.11));
      float lumD = dot(eD, vec3(0.3, 0.59, 0.11));

      // Gentle waves on internal oceans of the flat Earth, topographic bump on continents (rotated to world space)
      vec2 radDir = localXZ / max(r, 0.001);
      vec2 tanDir = vec2(radDir.y, -radDir.x);
      vec2 landGrad = tanDir * (lumC - lumR) * 2.8 + radDir * (lumC - lumD) * 2.8;
      vec3 innerOceanN = oceanNormal(localXZ * 5.2, uTime, 1.35 * distFade);
      vec3 landN = normalize(vec3(landGrad.x, 1.0, landGrad.y));
      vec3 surfN = rotY(normalize(mix(innerOceanN, landN, isLand)), uYaw);

      // Antarctic snowy ice-wall perimeter ring (r = 0.92..1.00) for unmistakable Flat Earth look
      float iceWall = smoothstep(0.915, 0.975, r);
      vec3 iceCol = vec3(0.90, 0.95, 0.99) * (0.90 + 0.10 * vnoise(localXZ * 38.0));
      albedo = mix(albedo, iceCol, iceWall * 0.88);
      isOcean *= (1.0 - iceWall);
      isLand = max(isLand, iceWall);

      // Rich dynamic illumination from orbiting Sun (warm day) + Moon (readable cool twilight)
      float ndlSun = max(dot(surfN, sunDir), 0.0);
      float ndlMoon = max(dot(surfN, moonDir), 0.0);

      // Keep Earth generously legible everywhere so the family can always visualize all continents clearly!
      vec3 dayLight = vec3(1.06, 0.99, 0.88) * (0.42 + 0.95 * ndlSun * (0.55 + 0.70 * sunSpot));
      vec3 moonLight = vec3(0.42, 0.62, 0.92) * (0.28 + 0.48 * ndlMoon * moonSpot);

      vec3 surfaceCol = albedo * (dayLight * (0.48 + 0.52 * sunSpot) + moonLight * (1.0 - 0.55 * sunSpot));
      // Warm solar pool right under the Sun
      surfaceCol += vec3(1.0, 0.88, 0.55) * sunCoreGlow * (0.14 + 0.12 * isLand);

      // Sparkle of ocean sun glint & moon glint on Earth's oceans
      vec3 halfSun = normalize(sunDir + viewDir);
      vec3 halfMoon = normalize(moonDir + viewDir);
      float oceanSpecSun = pow(max(dot(surfN, halfSun), 0.0001), 42.0) * 0.95 * sunSpot;
      float oceanSpecMoon = pow(max(dot(surfN, halfMoon), 0.0001), 36.0) * 0.45 * moonSpot;
      surfaceCol += vec3(1.0, 0.94, 0.74) * oceanSpecSun * isOcean;
      surfaceCol += vec3(0.76, 0.89, 1.0) * oceanSpecMoon * isOcean;

      // Subtle warm golden city lights on the Moonlit side of continents
      float nightMask = (1.0 - sunSpot) * isLand * (1.0 - iceWall);
      float cityNoise = hash21(floor(vec2(u * 300.0, v * 150.0)));
      float cityLight = smoothstep(0.958, 0.996, cityNoise) * nightMask * (1.0 - smoothstep(0.75, 0.90, r));
      surfaceCol += vec3(1.0, 0.82, 0.42) * cityLight * 1.15;

      // Subtle delicate latitude/equator & golden border rim
      float eqLine = exp(-abs(r - 0.50) * 260.0) * 0.16;
      surfaceCol += vec3(1.0, 0.88, 0.48) * eqLine;

      // Drifting translucent clouds slightly elevated above the disc (parallax offset!)
      float tCloud = -(camPos.y - 0.022) / rd.y;
      vec3 hitCloud = camPos + rd * tCloud;
      vec2 cXZ = vec2(hitCloud.x * cosY - hitCloud.z * sinY, hitCloud.x * sinY + hitCloud.z * cosY);
      float cR = length(cXZ);
      if (cR < 0.98) {
        float cu = fract(atan(cXZ.x, cXZ.y) / (2.0 * PI) + 0.5 - uCloudOffset);
        float cv = clamp(cR, 0.002, 0.998);
        float cloudA = texture2D(uCloudTex, vec2(cu, cv)).a * 0.46;
        float shadowA = texture2D(uCloudTex, vec2(fract(u - uCloudOffset + 0.005), v)).a * 0.20;
        surfaceCol *= (1.0 - shadowA);
        vec3 cloudCol = mix(vec3(0.56, 0.70, 0.90), vec3(1.0, 0.98, 0.94), 0.35 + 0.65 * sunSpot);
        surfaceCol = mix(surfaceCol, cloudCol, cloudA);
      }

      // Luminous golden-crystalline outer rim separating the flat Earth from the infinite ocean
      float rimGold = smoothstep(0.982, 0.999, r);
      surfaceCol = mix(surfaceCol, vec3(0.98, 0.86, 0.52), rimGold * 0.65);

      col = surfaceCol;
    } else {
      // ================= INFINITE SURROUNDING 3D OCEAN =================
      vec3 nOcean = rotY(oceanNormal(localXZ * 2.35, uTime, 2.85 * distFade), uYaw);
      float fresnel = pow(clamp(1.0 - max(dot(nOcean, viewDir), 0.0), 0.0001, 1.0), 3.2);

      // Rich deep turquoise-sapphire oceanic water palette
      float shallowRim = exp(-(r - 1.0) * 4.8);
      vec3 deepSea = vec3(0.022, 0.145, 0.305);
      vec3 midSea = vec3(0.042, 0.285, 0.495);
      vec3 shallowSea = vec3(0.09, 0.52, 0.64);
      vec3 seaCol = mix(deepSea, midSea, 0.40 + 0.60 * (0.45 + 0.55 * sunSpot));
      seaCol = mix(seaCol, shallowSea, shallowRim * 0.68);

      // Animated wave-crest highlights & ocean ripples
      float waveH = oceanWaveHeight(localXZ * 2.35, uTime);
      float crest = smoothstep(0.24, 0.72, waveH) * distFade;
      seaCol += vec3(0.18, 0.46, 0.64) * crest * (0.50 + 0.50 * sunSpot);

      // Sky reflection via Fresnel
      vec3 skyRefl = mix(vec3(0.10, 0.32, 0.54), vec3(0.45, 0.68, 0.88), sunSpot * 0.65);
      seaCol = mix(seaCol, skyRefl, fresnel * 0.52);

      // Golden shimmering Sun reflection path across the surrounding ocean waves!
      vec3 halfSun = normalize(sunDir + viewDir);
      float sunGlintTight = pow(max(dot(nOcean, halfSun), 0.0001), 64.0) * 1.45;
      float sunGlintBroad = pow(max(dot(nOcean, halfSun), 0.0001), 14.0) * 0.34;
      seaCol += vec3(1.0, 0.90, 0.58) * (sunGlintTight + sunGlintBroad) * (0.35 + 0.65 * sunSpot) * distFade;

      // Silvery-blue Moon reflection path across the surrounding ocean waves!
      vec3 halfMoon = normalize(moonDir + viewDir);
      float moonGlintTight = pow(max(dot(nOcean, halfMoon), 0.0001), 48.0) * 0.82;
      float moonGlintBroad = pow(max(dot(nOcean, halfMoon), 0.0001), 12.0) * 0.20;
      seaCol += vec3(0.76, 0.90, 1.0) * (moonGlintTight + moonGlintBroad) * (0.35 + 0.65 * moonSpot) * distFade;

      // Animated white sea-foam & soft golden tide ripples lapping around the edge of the Flat Earth
      float waveLap = sin((r - 1.0) * 44.0 - uTime * 2.6 + vnoise(localXZ * 12.0) * 4.5);
      float foam = smoothstep(1.075, 1.00, r) * (0.55 + 0.45 * waveLap);
      seaCol = mix(seaCol, vec3(0.84, 0.94, 0.98), clamp(foam * 0.55, 0.0, 0.72));

      // Subtle glowing golden aura hugging the outer edge of the Flat Earth disc
      float rimHalo = exp(-(r - 1.0) * 18.0) * 0.38;
      seaCol += vec3(1.0, 0.84, 0.42) * rimHalo;

      // Atmospheric oceanic mist blending far-distance water into the horizon
      float fog = 1.0 - exp(-tPlane * tPlane * 0.0038);
      col = mix(seaCol, horizonCol, clamp(fog, 0.0, 0.94));
    }
  }

  // ================= 3D ORBITING SUN & MOON (RAY-TRACED SPHERES + VOLUMETRIC HALOS) =================
  float sunRad = 0.076;
  float moonRad = 0.062;

  // Volumetric Sun corona & Moon silver aura in 3D space (respecting depth!)
  vec2 sunRay = rayPointDist(camPos, rd, sunPos);
  if (sunRay.y < hitDepth + 0.25) {
    float coronaSoft = exp(-sunRay.x * 6.5) * 0.78;
    float coronaCore = exp(-sunRay.x * 18.0) * 0.96;
    col += vec3(1.0, 0.84, 0.38) * coronaSoft + vec3(1.0, 0.96, 0.78) * coronaCore;
  }

  vec2 moonRay = rayPointDist(camPos, rd, moonPos);
  if (moonRay.y < hitDepth + 0.25) {
    float moonAura = exp(-moonRay.x * 10.5) * 0.52;
    col += vec3(0.68, 0.84, 1.0) * moonAura;
  }

  // Solid 3D Sun sphere intersection
  float tSun = intersectSphere(camPos, rd, sunPos, sunRad);
  if (tSun > 0.0 && tSun < hitDepth) {
    hitDepth = tSun;
    vec3 pSun = camPos + rd * tSun;
    vec3 nSun = normalize(pSun - sunPos);
    float facing = max(dot(nSun, -rd), 0.0);
    float plasma = vnoise(nSun.xy * 7.5 + vec2(uTime * 0.8, -uTime * 0.5)) * 0.55
                 + vnoise(nSun.yz * 15.0 - vec2(uTime * 1.1, uTime * 0.6)) * 0.45;
    vec3 sunCore = mix(vec3(1.0, 0.62, 0.14), vec3(1.0, 0.98, 0.84), pow(max(facing, 0.0001), 0.55));
    sunCore += vec3(1.0, 0.86, 0.42) * plasma * 0.28;
    col = sunCore;
  }

  // Solid 3D Moon sphere intersection (with realistic lunar maria & craters!)
  float tMoon = intersectSphere(camPos, rd, moonPos, moonRad);
  if (tMoon > 0.0 && tMoon < hitDepth) {
    hitDepth = tMoon;
    vec3 pMoon = camPos + rd * tMoon;
    vec3 nMoon = normalize(pMoon - moonPos);
    vec3 toSunFromMoon = normalize(sunPos - moonPos);
    float mDiff = max(dot(nMoon, toSunFromMoon), 0.0);
    float mView = max(dot(nMoon, -rd), 0.0);

    // Procedural lunar maria & fine craters
    float maria = vnoise(nMoon.xz * 4.5 + nMoon.y * 2.0);
    float craters = vnoise(nMoon.xy * 18.0 + nMoon.z * 9.0);
    vec3 lunarAlbedo = mix(vec3(0.58, 0.64, 0.72), vec3(0.92, 0.95, 0.98), smoothstep(0.32, 0.74, maria));
    lunarAlbedo *= (0.86 + 0.18 * craters);

    // Luminous silver rim + sunlit crescent + soft earthshine so full Moon sphere is always gorgeous
    float rimM = pow(clamp(1.0 - mView, 0.0001, 1.0), 2.4);
    col = lunarAlbedo * (0.48 + 0.75 * mDiff) + vec3(0.76, 0.88, 1.0) * rimM * 0.42;
  }

  // Subtle filmic tone curve for luminous highlights without clipping
  col = col / (1.0 + col * 0.18);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const [topDownMode, setTopDownMode] = useState(false);
  const [webglReady, setWebglReady] = useState(true);

  const camRef = useRef({
    yaw: 68, // Centers Americas right in the foreground
    pitch: 50, // Dramatic 3D perspective over the Flat Earth & surrounding ocean
    velYaw: 0.07,
    targetYaw: null as number | null,
    targetPitch: null as number | null,
  });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pinElsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeMembers = useMemo(
    () => snapshot.members.filter((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN'),
    [snapshot.members]
  );

  // Automatically de-overlap family members who share the exact same country coordinates
  const memberGeos = useMemo(() => {
    const raw = activeMembers.flatMap((member) => {
      const base = getSafeRegionCoords(member.location);
      return base ? [{ member, base }] : [];
    });
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
      const spreadLon = 7.5 * Math.cos(angle);
      const spreadLat = 5.5 * Math.sin(angle);
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

  const flyToLocation = useCallback((_lat: number, lon: number, pitchOverride?: number) => {
    // Rotating yaw to -lon swings that country right into the front-center foreground!
    camRef.current.targetYaw = -lon;
    camRef.current.targetPitch = pitchOverride ?? (topDownMode ? 78 : 48);
    camRef.current.velYaw = 0;
  }, [topDownMode]);

  // Real-time 60 FPS WebGL Flat Earth Disc + Infinite Ocean + Orbiting Sun & Moon + 3D Golden Arcs & Pins
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
    let uYaw: WebGLUniformLocation | null = null;
    let uPitch: WebGLUniformLocation | null = null;
    let uCamDist: WebGLUniformLocation | null = null;
    let uMagnification: WebGLUniformLocation | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uCloudOffset: WebGLUniformLocation | null = null;
    let uSunAngle: WebGLUniformLocation | null = null;
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
        new Uint8Array([14, 58, 108, 140])
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
            uYaw = gl.getUniformLocation(prog, 'uYaw');
            uPitch = gl.getUniformLocation(prog, 'uPitch');
            uCamDist = gl.getUniformLocation(prog, 'uCamDist');
            uMagnification = gl.getUniformLocation(prog, 'uMagnification');
            uTime = gl.getUniformLocation(prog, 'uTime');
            uCloudOffset = gl.getUniformLocation(prog, 'uCloudOffset');
            uSunAngle = gl.getUniformLocation(prog, 'uSunAngle');
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

      // Smooth spring fly-to target OR gentle ambient rotation
      const cam = camRef.current;
      if (!dragRef.current.active) {
        if (cam.targetYaw !== null && cam.targetPitch !== null) {
          const dYaw = ((cam.targetYaw - cam.yaw + 540) % 360) - 180;
          const dPitch = cam.targetPitch - cam.pitch;
          cam.yaw += dYaw * 0.1;
          cam.pitch += dPitch * 0.1;
          if (Math.abs(dYaw) < 0.2 && Math.abs(dPitch) < 0.2) {
            cam.targetYaw = null;
            cam.targetPitch = null;
            cam.velYaw = 0.04;
          }
        } else if (prefs.animationsEnabled && prefs.mode !== 'LIGHT') {
          cam.yaw += cam.velYaw;
          cam.velYaw += (0.045 - cam.velYaw) * 0.03;
        }
      }

      const zoomLevel = zoomRef.current;
      const cameraZoom = Math.min(zoomLevel, 1.4);
      const camDist = BASE_CAM_DIST / cameraZoom;
      const magnification = zoomLevel / cameraZoom;
      const project = (x: number, y: number, z: number) =>
        projectFlat3D(x, y, z, cam.yaw, cam.pitch, camDist, w, h, magnification);
      const animActive = prefs.animationsEnabled && prefs.mode !== 'LIGHT';
      const sunAngle = animActive ? 0.55 + elapsedSec * ORBIT_SPEED : 0.95;

      // 1. Render Photorealistic WebGL Flat Earth + Surrounding Ocean + Orbiting Sun & Moon
      if (gl && prog) {
        gl.viewport(0, 0, targetW, targetH);
        gl.uniform2f(uRes, targetW, targetH);
        gl.uniform1f(uYaw, (cam.yaw * Math.PI) / 180);
        gl.uniform1f(uPitch, (cam.pitch * Math.PI) / 180);
        gl.uniform1f(uCamDist, camDist);
        gl.uniform1f(uMagnification, magnification);
        gl.uniform1f(uTime, animActive ? elapsedSec : 1.0);
        gl.uniform1f(uCloudOffset, animActive ? (elapsedSec * 0.0045) % 1.0 : 0.0);
        gl.uniform1f(uSunAngle, sunAngle);
        gl.uniform1f(uHasTex, texLoaded ? 1.0 : 0.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // 2. Render 3D Orbital Halo Track, Sun/Moon Subtle Labels, Elevated Golden Family Arcs & Beacons
      ovCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ovCtx.clearRect(0, 0, w, h);

      if (gl && prog) {
        const time = animActive ? elapsedSec : 0;
        for (const animal of MARINE_LIFE) {
          const whale = animal.kind === 'whale';
          const angle = animal.phase + time * animal.speed;
          const stroke = time * (whale ? 2.1 : 4.2) + animal.phase;
          const surface = Math.max(0, Math.sin(stroke));
          const height = 0.016 + surface * (whale ? 0.012 : 0.045);
          const x = animal.radius * Math.cos(angle);
          const z = animal.radius * Math.sin(angle);
          const heading = Math.sign(animal.speed);
          const dx = -Math.sin(angle) * heading * animal.length / 2;
          const dz = Math.cos(angle) * heading * animal.length / 2;
          const nose = project(x + dx, height, z + dz);
          const tail = project(x - dx, height, z - dz);
          if (!nose.visible || !tail.visible) continue;

          const centerX = (nose.x + tail.x) / 2;
          const centerY = (nose.y + tail.y) / 2;
          const size = Math.hypot(nose.x - tail.x, nose.y - tail.y);
          if (size < 2 || centerX < -size || centerX > w + size ||
              centerY < -size || centerY > h + size) continue;

          ovCtx.save();
          ovCtx.translate(centerX, centerY);
          ovCtx.rotate(Math.atan2(nose.y - tail.y, nose.x - tail.x));
          ovCtx.scale(size, size * (whale ? 1.22 : 0.93));
          ovCtx.globalAlpha = 0.66 + surface * 0.34;
          drawMarineAnimal(ovCtx, whale, Math.sin(stroke) * 0.051);
          ovCtx.restore();
        }
      }

      // Draw graceful elevated 3D orbital track ring for the Sun & Moon above the Flat Earth
      const ringSteps = 72;
      ovCtx.save();
      ovCtx.beginPath();
      for (let i = 0; i <= ringSteps; i++) {
        const a = (i / ringSteps) * Math.PI * 2;
        const p = project(Math.sin(a) * ORBIT_RADIUS, ORBIT_ALTITUDE, Math.cos(a) * ORBIT_RADIUS);
        if (i === 0) ovCtx.moveTo(p.x, p.y);
        else ovCtx.lineTo(p.x, p.y);
      }
      ovCtx.setLineDash([4, 6]);
      ovCtx.strokeStyle = 'rgba(255, 232, 152, 0.36)';
      ovCtx.lineWidth = 1.25;
      ovCtx.stroke();
      ovCtx.restore();

      // Draw crisp Sun & Moon vertical light-drop beams + tiny glowing orbital labels
      const sunBob = Math.sin(sunAngle * 0.5) * 0.045;
      const sunLX = Math.sin(sunAngle) * (ORBIT_RADIUS + sunBob);
      const sunLZ = Math.cos(sunAngle) * (ORBIT_RADIUS + sunBob);
      const moonLX = Math.sin(sunAngle + Math.PI) * (ORBIT_RADIUS - sunBob);
      const moonLZ = Math.cos(sunAngle + Math.PI) * (ORBIT_RADIUS - sunBob);

      const pSun = project(sunLX, ORBIT_ALTITUDE, sunLZ);
      const pSunGround = project(sunLX, 0.005, sunLZ);
      const pMoon = project(moonLX, ORBIT_ALTITUDE, moonLZ);
      const pMoonGround = project(moonLX, 0.005, moonLZ);

      if (pSun.visible && pSunGround.visible) {
        ovCtx.save();
        const beam = ovCtx.createLinearGradient(pSun.x, pSun.y, pSunGround.x, pSunGround.y);
        beam.addColorStop(0, 'rgba(255, 236, 158, 0.34)');
        beam.addColorStop(1, 'rgba(255, 220, 108, 0.0)');
        ovCtx.strokeStyle = beam;
        ovCtx.lineWidth = 2.0;
        ovCtx.setLineDash([2, 4]);
        ovCtx.beginPath();
        ovCtx.moveTo(pSun.x, pSun.y);
        ovCtx.lineTo(pSunGround.x, pSunGround.y);
        ovCtx.stroke();

        // Subtle animated solar flare cross
        const flareR = 20 + Math.sin(elapsedSec * 3.0) * 3;
        const sunGrad = ovCtx.createRadialGradient(pSun.x, pSun.y, 1, pSun.x, pSun.y, flareR);
        sunGrad.addColorStop(0, 'rgba(255, 253, 224, 0.55)');
        sunGrad.addColorStop(0.45, 'rgba(255, 214, 92, 0.18)');
        sunGrad.addColorStop(1, 'rgba(255, 190, 52, 0)');
        ovCtx.fillStyle = sunGrad;
        ovCtx.beginPath();
        ovCtx.arc(pSun.x, pSun.y, flareR, 0, Math.PI * 2);
        ovCtx.fill();
        ovCtx.restore();
      }

      if (pMoon.visible && pMoonGround.visible) {
        ovCtx.save();
        const beamM = ovCtx.createLinearGradient(pMoon.x, pMoon.y, pMoonGround.x, pMoonGround.y);
        beamM.addColorStop(0, 'rgba(196, 224, 255, 0.24)');
        beamM.addColorStop(1, 'rgba(148, 198, 255, 0.0)');
        ovCtx.strokeStyle = beamM;
        ovCtx.lineWidth = 1.6;
        ovCtx.setLineDash([2, 4]);
        ovCtx.beginPath();
        ovCtx.moveTo(pMoon.x, pMoon.y);
        ovCtx.lineTo(pMoonGround.x, pMoonGround.y);
        ovCtx.stroke();
        ovCtx.restore();
      }

      // Draw graceful 3D elevated golden arcs across the Flat Earth between unique family regions
      if (memberGeos.length >= 2) {
        const hubAnchor = memberGeos[0].anchor;
        const [ax, az] = latLonToFlatLocal(hubAnchor.lat, hubAnchor.lon);
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

          const [bx, bz] = latLonToFlatLocal(anchor.lat, anchor.lon);
          const dist = Math.hypot(bx - ax, bz - az);
          const peakH = 0.09 + Math.min(0.22, dist * 0.22);
          const steps = 36;
          const pts: { x: number; y: number; visible: boolean }[] = [];

          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const lx = ax + (bx - ax) * t;
            const lz = az + (bz - az) * t;
            const ly = Math.sin(t * Math.PI) * peakH;
            pts.push(project(lx, ly, lz));
          }

          ovCtx.save();
          ovCtx.lineCap = 'round';
          ovCtx.beginPath();
          pts.forEach((pt, i) => {
            if (i === 0) ovCtx.moveTo(pt.x, pt.y);
            else ovCtx.lineTo(pt.x, pt.y);
          });
          ovCtx.strokeStyle = 'rgba(255, 224, 114, 0.86)';
          ovCtx.lineWidth = 2.2;
          ovCtx.shadowColor = 'rgba(255, 212, 74, 0.9)';
          ovCtx.shadowBlur = 8;
          ovCtx.stroke();

          // Animated golden shooting spark gliding along the 3D arc
          const sparkT = (elapsedSec * 0.36 + idx * 0.37) % 1;
          const sparkIdx = Math.min(steps - 1, Math.floor(sparkT * steps));
          const sp = pts[sparkIdx];
          if (sp.visible) {
            const grad = ovCtx.createRadialGradient(sp.x, sp.y, 0.5, sp.x, sp.y, 8.5);
            grad.addColorStop(0, 'rgba(255, 254, 232, 1)');
            grad.addColorStop(0.4, 'rgba(255, 218, 88, 0.92)');
            grad.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ovCtx.fillStyle = grad;
            ovCtx.beginPath();
            ovCtx.arc(sp.x, sp.y, 8.5, 0, Math.PI * 2);
            ovCtx.fill();
          }
          ovCtx.restore();
        });
      }

      // Draw pulsing golden radar beacon rings on the Flat Earth & position ALL DOM pins smoothly (0 React re-renders!)
      memberGeos.forEach(({ member, geo }, idx) => {
        const [lx, lz] = latLonToFlatLocal(geo.lat, geo.lon);
        const p = project(lx, 0.012, lz);
        const el = pinElsRef.current.get(member.id);

        if (p.visible) {
          const pulse = (elapsedSec * 0.72 + idx * 0.28) % 1;
          ovCtx.save();
          ovCtx.beginPath();
          ovCtx.ellipse(
            p.x,
            p.y,
            5 + pulse * 17,
            (5 + pulse * 17) * Math.max(0.42, Math.sin((cam.pitch * Math.PI) / 180)),
            0,
            0,
            Math.PI * 2
          );
          ovCtx.strokeStyle = `rgba(255, 224, 118, ${(1 - pulse) * 0.78})`;
          ovCtx.lineWidth = 1.6;
          ovCtx.stroke();
          ovCtx.restore();

          if (el) {
            const depthScale = Math.max(0.76, Math.min(1.12, (BASE_CAM_DIST / Math.max(1.0, p.depth)) * 0.96));
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -62%) scale(${depthScale})`;
            el.style.zIndex = String(Math.max(10, Math.round(50 - p.depth * 10)));
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
  }, [memberGeos, prefs.animationsEnabled, prefs.mode]);

  if (!currentUser) return null;

  const selectedMember =
    activeMembers.find((m) => m.id === selectedMemberId) ?? activeMembers[0];
  const selectedGeo = selectedMember ? getSafeRegionCoords(selectedMember.location) : null;

  const handleToggleTopDown = () => {
    triggerFeedback('tap');
    setTopDownMode((prev) => {
      const next = !prev;
      camRef.current.targetYaw = camRef.current.yaw;
      camRef.current.targetPitch = next ? 80 : 50;
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Hero Section: Interactive 3D Flat Earth with Orbiting Sun & Moon over Infinite Ocean */}
      <div className="card-crochet overflow-hidden rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1 text-[11px] font-bold text-solar-300">
              <Sun className="h-3.5 w-3.5" /> Tierra plana 3D · Sol y Luna en vivo
            </span>
            <h2 className="mt-1.5 font-editorial text-2xl font-bold text-forest-900 sm:text-3xl">
              Nuestra familia conectada en la Tierra 🇧🇷✨
            </h2>
            <p className="mt-0.5 text-xs text-espresso-700 sm:text-sm">
              Visualiza todos los continentes al mismo tiempo con el Sol y la Luna girando sobre el
              plano. Busca delfines y ballenas alrededor. Arrastra para girar y toca a un familiar.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleTopDown}
              className={`liquid-glass-pill btn-yarn-press flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold ${
                topDownMode ? 'bg-forest-700 text-solar-200' : 'text-forest-900'
              }`}
              title={topDownMode ? 'Cambiar a vista 3D inclinada' : 'Ver desde arriba'}
              aria-label={topDownMode ? 'Vista 3D inclinada' : 'Vista desde arriba'}
            >
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">{topDownMode ? 'Vista 3D' : 'Desde arriba'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP));
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Alejar mapa"
              disabled={zoom <= MIN_ZOOM}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP));
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Acercar mapa"
              disabled={zoom >= MAX_ZOOM}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom(MAX_ZOOM);
              }}
              className="liquid-glass-pill btn-yarn-press h-10 rounded-xl px-2.5 text-xs font-bold text-forest-900"
              aria-label="Zoom máximo, ocho aumentos"
              disabled={zoom >= MAX_ZOOM}
            >
              8×
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setTopDownMode(false);
                camRef.current.targetYaw = 68;
                camRef.current.targetPitch = 50;
                camRef.current.velYaw = 0;
                setZoom(1);
              }}
              className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl text-forest-900"
              aria-label="Restablecer vista"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3D Flat Earth Ocean Stage + Selected Member Card */}
        <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
          {/* Interactive Photorealistic WebGL Flat Earth Disc + Ocean + Orbiting Sun & Moon */}
          <div
            className="relative h-[360px] w-full cursor-grab touch-none overflow-hidden rounded-3xl border border-solar-300/80 bg-[#05203E] shadow-[0_20px_50px_-14px_rgba(4,24,48,0.72)] active:cursor-grabbing sm:h-[430px] lg:col-span-7"
            onPointerDown={(e) => {
              camRef.current.targetYaw = null;
              camRef.current.targetPitch = null;
              dragRef.current = { active: true, x: e.clientX, y: e.clientY };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.x;
              const dy = e.clientY - dragRef.current.y;
              camRef.current.yaw += dx * 0.44;
              camRef.current.pitch = Math.max(24, Math.min(84, camRef.current.pitch + dy * 0.34));
              camRef.current.velYaw = dx * 0.055;
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
            {/* Layer 1: GPU WebGL Flat Earth Disc, Animated Ocean Backdrop & 3D Orbiting Sun + Moon */}
            <canvas ref={glCanvasRef} className="absolute inset-0 h-full w-full" />

            {/* Layer 2: 3D Orbital Halo, Sun/Moon Light Beams, Elevated Golden Family Arcs & Beacons */}
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />

            {/* Layer 3: Clickable Family Avatar Pins (ALL visible simultaneously at 60 FPS) */}
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
                <span className="mt-0.5 whitespace-nowrap rounded-full border border-solar-300/80 bg-[#071E38]/85 px-2 py-0.5 text-[10px] font-bold text-solar-200 shadow-md backdrop-blur-md">
                  {geo.flag} {member.name.split(' ')[0]}
                </span>
              </button>
            ))}

            {/* Top-left Live 3D badge */}
            <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-solar-300/70 bg-[#071E38]/75 px-2.5 py-1 text-[10px] font-bold text-solar-200 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-solar-300" />
              {webglReady ? '☀️ Sol y 🌙 Luna en órbita · Océano 3D' : 'Plano 3D Interactivo'}
            </span>

            <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-solar-300/70 bg-[#071E38]/78 px-3.5 py-1 text-[11px] font-semibold text-solar-100 shadow-md backdrop-blur-md">
              👆 Arrastra para girar o inclinar la Tierra plana
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
                    {selectedGeo ? `${selectedGeo.flag} ${selectedGeo.regionLabel}` : 'Ubicación sin confirmar'}
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
