import React, { useMemo, useRef, useState } from 'react';
import {
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
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


const outlines: {color:string; points:number[][]}[] = [
{color:'#78ad69',points:[[72,-168],[60,-140],[55,-130],[48,-124],[32,-117],[23,-105],[15,-90],[9,-80],[18,-84],[23,-97],[29,-95],[30,-85],[45,-66],[55,-60],[60,-78],[72,-85],[80,-105],[72,-168]]},
{color:'#e7b65b',points:[[12,-72],[10,-60],[5,-51],[-6,-35],[-23,-43],[-35,-57],[-55,-68],[-42,-74],[-18,-70],[-5,-80],[8,-77]]},
{color:'#e8dfc1',points:[[60,-45],[65,-55],[80,-65],[83,-30],[72,-20]]},
{color:'#93ba65',points:[[36,-10],[44,-9],[48,-5],[58,5],[71,28],[65,42],[48,40],[40,28],[36,15],[43,5]]},
{color:'#dba15f',points:[[35,-6],[37,10],[31,32],[12,44],[0,42],[-12,35],[-35,19],[-25,12],[-5,9],[5,-15],[20,-17]]},
{color:'#79b89a',points:[[71,28],[78,90],[72,140],[65,180],[52,160],[43,140],[24,120],[10,105],[22,90],[8,78],[24,68],[30,48],[40,28]]},
{color:'#d88e77',points:[[-12,130],[-15,145],[-28,153],[-39,145],[-35,116],[-22,114]]},
{color:'#93ba65',points:[[6,95],[-6,105],[-8,120],[-3,140],[4,125],[7,110]]}
];
function xy(lat:number,lon:number){return [(lon+180)/360*360,(90-lat)/180*180];}
export const FamilyWorldView: React.FC = () => {
 const {snapshot,currentUser,openChatWithMember,openProfile,startCall}=useFamilyApp();
 const {prefs,triggerFeedback}=useAppearance();
 const [selectedMemberId,setSelectedMemberId]=useState<string|null>(null);
 const [zoom,setZoom]=useState(1);
 const [center,setCenter]=useState([180,90]);
 const drag=useRef<{x:number;y:number}|null>(null);
 const activeMembers=useMemo(()=>snapshot.members.filter(m=>m.status==='ACTIVE'&&m.role!=='ADMIN'),[snapshot.members]);
 const memberGeos=useMemo(()=>activeMembers.flatMap(member=>{const geo=getSafeRegionCoords(member.location);return geo?[{member,geo}]:[]}),[activeMembers]);
 const flyToLocation=(lat:number,lon:number)=>{setCenter(xy(lat,lon));setZoom(z=>Math.max(z,2));};
 if(!currentUser)return null;
 const selectedMember=activeMembers.find(m=>m.id===selectedMemberId)??activeMembers[0];
 const selectedGeo=selectedMember?getSafeRegionCoords(selectedMember.location):null;
 const groups=new Map<string,typeof memberGeos>();
 memberGeos.forEach(item=>{const k=item.geo.lat.toFixed(1)+','+item.geo.lon.toFixed(1);groups.set(k,[...(groups.get(k)??[]),item]);});
 return <div className="mx-auto max-w-6xl space-y-5"><div className="card-crochet overflow-hidden rounded-3xl p-4 sm:p-6">
 <span className="inline-flex items-center gap-2 rounded-full bg-forest-700 px-3 py-1 text-xs font-bold text-solar-300"><Sun className="h-4 w-4"/>Mapa crochet 2D · ligero</span>
 <h2 className="mt-2 font-editorial text-2xl font-bold text-forest-900">Nuestra familia conectada 🌎</h2>
 <p className="text-sm text-espresso-700">Toca un familiar o acerca el mapa. Ubicaciones aproximadas.</p>
 <div className="my-3 flex gap-2">
 <button aria-label="Alejar" className="liquid-glass-pill rounded-xl p-3" onClick={()=>setZoom(z=>Math.max(1,z/1.5))}><ZoomOut size={20}/></button>
 <button aria-label="Acercar" className="liquid-glass-pill rounded-xl p-3" onClick={()=>setZoom(z=>Math.min(8,z*1.5))}><ZoomIn size={20}/></button>
 <button aria-label="Restablecer" className="liquid-glass-pill rounded-xl p-3" onClick={()=>{setZoom(1);setCenter([180,90]);}}><RotateCcw size={20}/></button></div>
 <div className="mt-4 grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
 <div className="relative lg:col-span-7">
 <svg viewBox={`${Math.max(0,Math.min(360-360/zoom,center[0]-180/zoom))} ${Math.max(0,Math.min(180-180/zoom,center[1]-90/zoom))} ${360/zoom} ${180/zoom}`} className="w-full rounded-2xl" style={{touchAction:zoom>1?'none':'pan-y',background:'#87c5d2'}} onPointerDown={e=>{if(zoom>1){drag.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMove={e=>{if(!drag.current)return;const scale=360/zoom/e.currentTarget.getBoundingClientRect().width;const dx=(drag.current.x-e.clientX)*scale,dy=(drag.current.y-e.clientY)*scale;setCenter(c=>[Math.max(180/zoom,Math.min(360-180/zoom,c[0]+dx)),Math.max(90/zoom,Math.min(180-90/zoom,c[1]+dy))]);drag.current={x:e.clientX,y:e.clientY};}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
 <defs><pattern id="family-yarn" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 0 Q5 2.5 0 5 M2.5 0 Q7.5 2.5 2.5 5" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth=".6"/></pattern></defs>
 <rect width="360" height="180" fill="#87c5d2"/>
 {outlines.map((o,i)=><polygon key={i} points={o.points.map(([lat,lon])=>xy(lat,lon).join(',')).join(' ')} fill={o.color} stroke="#fff1c8" strokeWidth="1.2" strokeLinejoin="round"/>)}
 <path d="M0 169 Q90 165 180 171 T360 169 V180 H0Z" fill="#eee8d6"/>
 <rect width="360" height="180" fill="url(#family-yarn)" pointerEvents="none"/>
 <g pointerEvents="none"><circle cx="30" cy="22" r="9" fill="#ffd45d" stroke="#d69c35" strokeDasharray="2 2" strokeWidth="2"/><path d="M324 13 A10 10 0 1 0 337 27 A9 9 0 0 1 324 13" fill="#fff2cc"/>{prefs.animationsEnabled&&<animateTransform attributeName="transform" type="translate" values="0 0;5 2;0 0" dur="12s" repeatCount="indefinite"/>}</g>
 {Array.from(groups.values()).map(items=>{const [x,y]=xy(items[0].geo.lat,items[0].geo.lon);return <g key={items[0].member.id} transform={`translate(${x} ${y}) scale(${1/Math.sqrt(zoom)})`} role="button" tabIndex={0} aria-label={items.map(i=>i.member.name).join(', ')} onPointerDown={e=>e.stopPropagation()} onClick={()=>{triggerFeedback('tap');const index=items.findIndex(i=>i.member.id===selectedMemberId);setSelectedMemberId(items[(index+1)%items.length].member.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const index=items.findIndex(i=>i.member.id===selectedMemberId);setSelectedMemberId(items[(index+1)%items.length].member.id);}}} style={{cursor:'pointer'}}><circle r="9" fill="#225b43" stroke="#ffe29a" strokeWidth="2"/><text textAnchor="middle" y="3" fontSize="8" fill="white" fontWeight="bold">{items.length>1?items.length:items[0].member.name.charAt(0)}</text></g>;})}
 </svg><p className="mt-2 text-center text-xs text-espresso-700">Mapa ilustrado · toca los grupos para recorrer sus familiares</p></div>
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
