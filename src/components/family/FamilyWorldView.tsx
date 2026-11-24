import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Globe2,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
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
  if (loc.includes('brasil') || loc.includes('brazil') || loc.includes('sao') || loc.includes('rio')) {
    return { lat: -15.8, lon: -47.9, regionLabel: 'Brasil', flag: '🇧🇷' };
  }
  if (loc.includes('madrid') || loc.includes('españa') || loc.includes('espana')) {
    return { lat: 40.4, lon: -3.7, regionLabel: 'España', flag: '🇪🇸' };
  }
  if (loc.includes('bogot') || loc.includes('colombia')) {
    return { lat: 4.7, lon: -74.1, regionLabel: 'Colombia', flag: '🇨🇴' };
  }
  if (loc.includes('medell')) {
    return { lat: 6.2, lon: -75.6, regionLabel: 'Colombia', flag: '🇨🇴' };
  }
  if (loc.includes('méxico') || loc.includes('mexico')) {
    return { lat: 19.4, lon: -99.1, regionLabel: 'México', flag: '🇲🇽' };
  }
  if (loc.includes('buenos aires') || loc.includes('argentina')) {
    return { lat: -34.6, lon: -58.4, regionLabel: 'Argentina', flag: '🇦🇷' };
  }
  return { lat: -10.0, lon: -52.0, regionLabel: location || 'Familia Nazco', flag: '💛' };
}

// Simplified lightweight continent polygons (lat, lon) rendered with woven crochet stitching
const CONTINENTS: { name: string; color: string; trim: string; pts: [number, number][] }[] = [
  {
    name: 'Sudamérica',
    color: '#398B4B',
    trim: '#F2C443',
    pts: [
      [11, -74], [9, -62], [2, -50], [-6, -35], [-16, -39], [-24, -44],
      [-35, -56], [-52, -68], [-54, -73], [-38, -73], [-18, -71], [-5, -81], [5, -77],
    ],
  },
  {
    name: 'Norteamérica',
    color: '#2F7D43',
    trim: '#BA9254',
    pts: [
      [58, -135], [60, -95], [50, -64], [38, -75], [25, -80], [28, -96],
      [19, -97], [14, -88], [18, -104], [32, -117], [48, -124],
    ],
  },
  {
    name: 'Europa',
    color: '#398B4B',
    trim: '#F2C443',
    pts: [
      [36, -9], [43, -9], [48, -4], [54, 6], [60, 10], [60, 28],
      [48, 30], [40, 22], [38, 12], [36, -5],
    ],
  },
  {
    name: 'África',
    color: '#2E723C',
    trim: '#F2C443',
    pts: [
      [35, -6], [33, 10], [31, 32], [12, 44], [-10, 40], [-34, 20],
      [-26, 15], [4, 9], [14, -17],
    ],
  },
];

function project3D(lat: number, lon: number, rotLon: number, rotLat: number, r: number, cx: number, cy: number) {
  const phi = (lat * Math.PI) / 180;
  const lam = ((lon - rotLon) * Math.PI) / 180;
  const tilt = (rotLat * Math.PI) / 180;

  const x0 = Math.cos(phi) * Math.sin(lam);
  const y0 = Math.sin(phi);
  const z0 = Math.cos(phi) * Math.cos(lam);

  const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
  const z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);

  return {
    x: cx + x0 * r,
    y: cy - y1 * r,
    z: z1,
    visible: z1 > -0.05,
  };
}

export const FamilyWorldView: React.FC = () => {
  const { snapshot, currentUser, openChatWithMember, openProfile, startCall } = useFamilyApp();
  const { prefs, triggerFeedback } = useAppearance();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const rotRef = useRef({ lon: -48, lat: 8, velLon: 0.14 });
  const dragRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pins, setPins] = useState<
    { member: FamilyMember; x: number; y: number; visible: boolean; region: GeoCoords }[]
  >([]);

  const activeMembers = useMemo(
    () => snapshot.members.filter((m) => m.status === 'ACTIVE'),
    [snapshot.members]
  );

  const memberGeos = useMemo(
    () => activeMembers.map((m) => ({ member: m, geo: getSafeRegionCoords(m.location) })),
    [activeMembers]
  );

  // Interactive 3D Crochet Globe animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let tick = 0;

    const render = () => {
      tick += 0.025;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.39 * zoom;

      if (!dragRef.current.active && prefs.animationsEnabled && prefs.mode !== 'LIGHT') {
        rotRef.current.lon += rotRef.current.velLon;
        rotRef.current.velLon += (0.12 - rotRef.current.velLon) * 0.03;
      }

      ctx.clearRect(0, 0, w, h);

      // Soft ambient golden glow behind crochet globe
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.28);
      halo.addColorStop(0, 'rgba(242, 196, 67, 0.32)');
      halo.addColorStop(1, 'rgba(242, 196, 67, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.28, 0, Math.PI * 2);
      ctx.fill();

      // 3D Ocean Blue Crochet Sphere
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.32,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, '#3D84BD');
      oceanGrad.addColorStop(0.55, '#16466C');
      oceanGrad.addColorStop(1, '#0B243B');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();
      ctx.clip();

      // Woven crochet latitude & longitude yarn stitch rings
      ctx.strokeStyle = 'rgba(182, 222, 250, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 10) {
          const p = project3D(lat, lon, rotRef.current.lon, rotRef.current.lat, radius, cx, cy);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else ctx.lineTo(p.x, p.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 10) {
          const p = project3D(lat, lon, rotRef.current.lon, rotRef.current.lat, radius, cx, cy);
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else ctx.lineTo(p.x, p.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Draw crocheted green & solar-yellow continents
      for (const cont of CONTINENTS) {
        const projected = cont.pts.map(([lat, lon]) =>
          project3D(lat, lon, rotRef.current.lon, rotRef.current.lat, radius, cx, cy)
        );
        if (projected.some((p) => p.visible)) {
          ctx.beginPath();
          projected.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.closePath();
          ctx.fillStyle = cont.color;
          ctx.fill();
          ctx.strokeStyle = cont.trim;
          ctx.lineWidth = 2.2;
          ctx.setLineDash([5, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Animated golden threads connecting Brazil (hub) to every relative
      const hub = project3D(-15.8, -47.9, rotRef.current.lon, rotRef.current.lat, radius, cx, cy);
      memberGeos.forEach(({ geo }, idx) => {
        const dst = project3D(geo.lat, geo.lon, rotRef.current.lon, rotRef.current.lat, radius, cx, cy);
        if (hub.visible || dst.visible) {
          const midX = (hub.x + dst.x) / 2;
          const midY = (hub.y + dst.y) / 2 - 26 - (idx % 3) * 8;
          ctx.beginPath();
          ctx.moveTo(hub.x, hub.y);
          ctx.quadraticCurveTo(midX, midY, dst.x, dst.y);
          ctx.strokeStyle = '#F2C443';
          ctx.lineWidth = 2.4;
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -tick * 16;
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      ctx.restore();

      // Stitched outer rim around crochet globe
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#BA9254';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Update interactive DOM pins (throttled neatly per frame)
      const nextPins = memberGeos.map(({ member, geo }) => {
        const p = project3D(geo.lat, geo.lon, rotRef.current.lon, rotRef.current.lat, radius, cx, cy);
        return { member, x: p.x, y: p.y, visible: p.z > 0.08, region: geo };
      });
      setPins(nextPins);

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
      {/* Hero Section: Nuestros hilos por el mundo */}
      <div className="card-crochet overflow-hidden rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-3 py-1 text-[11px] font-bold text-solar-300">
              <Globe2 className="h-3.5 w-3.5" /> Nuestros hilos por el mundo
            </span>
            <h2 className="mt-1.5 font-editorial text-2xl font-bold text-forest-900 sm:text-3xl">
              Familia Nazco conectada en el planeta 🇧🇷✨
            </h2>
            <p className="mt-0.5 text-xs text-espresso-600 sm:text-sm">
              Arrastra el globo tejido para girarlo y toca cualquier fotografía familiar para saludar.
              Solo se muestran países/ciudades autorizadas, nunca direcciones privadas.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))));
              }}
              className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl border border-cotton-300 bg-white text-forest-800"
              aria-label="Alejar globo"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setZoom((z) => Math.min(1.25, Number((z + 0.15).toFixed(2))));
              }}
              className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl border border-cotton-300 bg-white text-forest-800"
              aria-label="Acercar globo"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                rotRef.current = { lon: -48, lat: 8, velLon: 0.14 };
                setZoom(1);
              }}
              className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl border border-cotton-300 bg-white text-forest-800"
              aria-label="Centrar globo en Brasil"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Globe + Selected Member Card */}
        <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
          {/* Interactive Draggable 3D Crochet Globe */}
          <div
            className="relative h-[320px] w-full cursor-grab touch-none overflow-hidden rounded-3xl border-2 border-dashed border-artisanal-500/50 bg-gradient-to-b from-ocean-50 via-cotton-50 to-brazil-50 active:cursor-grabbing sm:h-[380px] lg:col-span-7"
            onPointerDown={(e) => {
              dragRef.current = { active: true, x: e.clientX, y: e.clientY };
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!dragRef.current.active) return;
              const dx = e.clientX - dragRef.current.x;
              const dy = e.clientY - dragRef.current.y;
              rotRef.current.lon -= dx * 0.45;
              rotRef.current.lat = Math.max(-45, Math.min(45, rotRef.current.lat + dy * 0.35));
              rotRef.current.velLon = -dx * 0.08;
              dragRef.current.x = e.clientX;
              dragRef.current.y = e.clientY;
            }}
            onPointerUp={() => {
              dragRef.current.active = false;
            }}
          >
            <canvas ref={canvasRef} className="h-full w-full" />

            {/* Clickable Family Avatar Pins on Globe */}
            {pins.map(({ member, x, y, visible, region }) =>
              visible ? (
                <button
                  key={member.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerFeedback('tap');
                    setSelectedMemberId(member.id);
                  }}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute z-10 flex flex-col items-center transition-transform hover:scale-110 ${
                    selectedMember?.id === member.id ? 'scale-110' : ''
                  }`}
                >
                  <div
                    className={`rounded-full p-0.5 shadow-lg ${
                      selectedMember?.id === member.id
                        ? 'bg-solar-400 ring-2 ring-forest-700'
                        : 'bg-white ring-2 ring-brazil-500'
                    }`}
                  >
                    <MemberAvatar member={member} size="xs" showPresence />
                  </div>
                  <span className="mt-0.5 rounded-full bg-forest-900/85 px-1.5 py-0.5 text-[10px] font-bold text-solar-200 shadow">
                    {region.flag} {member.name.split(' ')[0]}
                  </span>
                </button>
              ) : null
            )}

            <span className="pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold text-forest-800 shadow-sm backdrop-blur-sm">
              👆 Arrastra para girar el globo de crochet
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

              <p className="mt-3.5 rounded-2xl bg-white/75 p-3 text-sm leading-relaxed text-espresso-800">
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
                  className="btn-yarn-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-cotton-300 bg-white text-xs font-bold text-forest-800"
                >
                  <Phone className="h-4 w-4 text-brazil-500" />
                  Llamada de voz
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    openProfile(selectedMember.id);
                  }}
                  className="btn-yarn-press flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-cotton-300 bg-white text-xs font-bold text-espresso-800"
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
          Toda la familia Nazco ({activeMembers.length})
        </h3>
        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeMembers.map((member) => {
            const region = getSafeRegionCoords(member.location);
            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2.5 rounded-2xl border border-cotton-300 bg-white/80 p-3 transition hover:border-brazil-500"
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    setSelectedMemberId(member.id);
                    rotRef.current.lon = region.lon;
                    rotRef.current.lat = region.lat * 0.4;
                  }}
                  className="flex min-w-0 items-center gap-3 text-left"
                >
                  <MemberAvatar member={member} size="md" showPresence />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-espresso-900">{member.name}</p>
                    <p className="truncate text-xs text-espresso-600">
                      {member.relationship} · {region.flag} {region.regionLabel}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openChatWithMember(member.id)}
                    className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl bg-brazil-50 text-forest-700 hover:bg-brazil-100"
                    title={`Mensaje a ${member.name}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openProfile(member.id)}
                    className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-xl bg-solar-100 text-forest-900 hover:bg-solar-200"
                    title={`Ver perfil de ${member.name}`}
                  >
                    <User className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
