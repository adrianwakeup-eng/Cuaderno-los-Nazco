import React, { useState } from 'react';
import { BellRing, Clock, Hash, Phone, ShieldAlert, Users, Video } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import type { CallHistoryEntry, FamilyMember } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { IncomingCallModal } from './IncomingCallModal';

const CALL_HISTORY_KEY = 'cuaderno_los_nazco_call_history_v1';

function loadCallHistory(): CallHistoryEntry[] {
  try {
    const raw = localStorage.getItem(CALL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CallHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CallsHubView: React.FC = () => {
  const { snapshot, currentUser, startCall, notify } = useFamilyApp();
  const { triggerFeedback } = useAppearance();
  const [joinCode, setJoinCode] = useState('');
  const [history, setHistory] = useState<CallHistoryEntry[]>(loadCallHistory);
  const [previewCaller, setPreviewCaller] = useState<FamilyMember | null>(null);

  if (!currentUser) return null;

  const enabled = snapshot.featureFlags.videoCallsEnabled;
  const activeRelatives = snapshot.members.filter(
    (m) => m.status === 'ACTIVE' && m.id !== currentUser.id
  );

  const launchAndLogCall = (params: Parameters<typeof startCall>[0]) => {
    triggerFeedback('chime');
    const entry: CallHistoryEntry = {
      id: `ch_${Date.now()}`,
      title: params.title,
      mode: params.mode,
      scope: params.scope,
      participantIds: params.participantIds,
      startedAt: new Date().toISOString(),
      durationSec: 0,
    };
    const next = [entry, ...history].slice(0, 12);
    setHistory(next);
    try {
      localStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    startCall(params);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!enabled && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-solar-400 bg-solar-50 p-4 text-sm font-bold text-espresso-900">
          <ShieldAlert className="h-5 w-5 shrink-0 text-solar-600" />
          El módulo de videollamadas está desactivado actualmente desde el Panel de Administración.
        </div>
      )}

      {/* Hero: Senior-Friendly Huge Family Room Controls + Join by Code */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="crochet-parchment rounded-3xl p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-forest-700 px-3.5 py-1 text-xs font-bold text-solar-300">
            <Users className="h-3.5 w-3.5" /> Sala Familiar Permanente
          </div>
          <h2 className="font-editorial text-3xl font-bold text-forest-900">
            Sala Familiar Nazco
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-espresso-800">
            Botones grandes y claros para reunirse en familia por WebRTC con cámara, micrófono y
            código privado de 6 dígitos.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={!enabled}
              onClick={() =>
                launchAndLogCall({
                  mode: 'VIDEO',
                  scope: 'FAMILY_ROOM',
                  title: 'Sala Familiar · Los Nazco',
                  participantIds: snapshot.members
                    .filter((m) => m.status === 'ACTIVE')
                    .map((m) => m.id),
                  roomCode: '202601',
                  isHost: true,
                })
              }
              className="crochet-green-3d btn-yarn-press flex min-h-[56px] flex-1 items-center justify-center gap-2.5 rounded-2xl px-5 text-base font-bold text-white disabled:opacity-45"
            >
              <Video className="h-5 w-5 text-solar-300" />
              Videollamada Familiar
            </button>

            <button
              type="button"
              disabled={!enabled}
              onClick={() =>
                launchAndLogCall({
                  mode: 'AUDIO',
                  scope: 'FAMILY_ROOM',
                  title: 'Sala de Audio · Los Nazco',
                  participantIds: snapshot.members
                    .filter((m) => m.status === 'ACTIVE')
                    .map((m) => m.id),
                  roomCode: '202602',
                  isHost: true,
                })
              }
              className="crochet-gold-3d btn-yarn-press flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-5 text-base font-bold text-forest-900 disabled:opacity-45"
            >
              <Phone className="h-5 w-5" />
              Solo Voz
            </button>
          </div>
        </div>

        {/* Join Existing Room by 6-digit Code */}
        <div className="card-crochet flex flex-col justify-between rounded-3xl p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-ocean-100 px-3 py-1 text-xs font-bold text-ocean-700">
              <Hash className="h-3.5 w-3.5" /> Unirse con Código WebRTC
            </div>
            <h2 className="font-editorial text-2xl font-bold text-forest-900 sm:text-3xl">
              Entrar a una llamada activa
            </h2>
            <p className="mt-1.5 text-sm text-espresso-600">
              Si un familiar te pasó un código de 6 dígitos, escríbelo aquí para unirte al instante.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ej. 202601"
                inputMode="numeric"
                className="min-h-[52px] flex-1 rounded-2xl border-2 border-cotton-300 bg-white px-4 font-mono text-xl tracking-widest text-forest-900 focus:border-forest-700 focus:outline-none"
              />
              <button
                type="button"
                disabled={!enabled || joinCode.length < 4}
                onClick={() =>
                  launchAndLogCall({
                    mode: 'VIDEO',
                    scope: 'FAMILY_ROOM',
                    title: `Sala Familiar #${joinCode}`,
                    participantIds: [currentUser.id],
                    roomCode: joinCode,
                    isHost: false,
                  })
                }
                className="crochet-green-3d btn-yarn-press min-h-[52px] rounded-2xl px-6 text-sm font-bold text-white disabled:opacity-45"
              >
                Unirme
              </button>
            </div>

            {activeRelatives[0] && (
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setPreviewCaller(activeRelatives[0]);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-ocean-600 hover:underline"
              >
                <BellRing className="h-3.5 w-3.5" />
                Ver vista previa de pantalla de llamada entrante
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Large Senior-Friendly 1-to-1 Family Directory */}
      <div className="card-crochet rounded-3xl p-5 sm:p-6">
        <h3 className="font-editorial text-2xl font-bold text-forest-900">
          Familiares disponibles
        </h3>
        <p className="mt-0.5 text-sm text-espresso-600">
          Toca el botón verde de Video o el botón dorado de Voz junto a cualquier familiar.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activeRelatives.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-cotton-300 bg-white/85 p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-full border-2 border-dashed border-brazil-500 p-0.5">
                  <MemberAvatar member={member} size="md" showPresence />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-espresso-900">{member.name}</p>
                  <p className="truncate text-xs font-medium text-espresso-600">
                    {member.relationship}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() =>
                    launchAndLogCall({
                      mode: 'AUDIO',
                      scope: 'DIRECT',
                      title: member.name,
                      participantIds: [currentUser.id, member.id],
                    })
                  }
                  className="crochet-gold-3d btn-yarn-press flex h-12 w-12 items-center justify-center rounded-2xl text-forest-900 disabled:opacity-45"
                  title={`Llamar por voz a ${member.name}`}
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() =>
                    launchAndLogCall({
                      mode: 'VIDEO',
                      scope: 'DIRECT',
                      title: member.name,
                      participantIds: [currentUser.id, member.id],
                    })
                  }
                  className="crochet-green-3d btn-yarn-press flex h-12 w-12 items-center justify-center rounded-2xl text-white disabled:opacity-45"
                  title={`Videollamar a ${member.name}`}
                >
                  <Video className="h-5 w-5 text-solar-300" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Call History (when real calls have been initiated) */}
      {history.length > 0 && (
        <div className="card-crochet rounded-3xl p-5">
          <h3 className="flex items-center gap-2 font-editorial text-xl font-bold text-forest-900">
            <Clock className="h-5 w-5 text-brazil-500" />
            Historial reciente de llamadas
          </h3>
          <div className="mt-3 space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-cotton-200 bg-white/75 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  {item.mode === 'VIDEO' ? (
                    <Video className="h-4 w-4 text-forest-700" />
                  ) : (
                    <Phone className="h-4 w-4 text-solar-600" />
                  )}
                  <span className="font-bold text-espresso-900">{item.title}</span>
                </div>
                <span className="text-xs text-espresso-500">
                  {new Date(item.startedAt).toLocaleString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incoming Call Preview Modal */}
      <IncomingCallModal
        caller={previewCaller}
        mode="VIDEO"
        isPreview
        onReject={() => {
          setPreviewCaller(null);
          notify('Llamada rechazada.', 'info');
        }}
        onAccept={() => {
          const target = previewCaller;
          setPreviewCaller(null);
          if (target) {
            launchAndLogCall({
              mode: 'VIDEO',
              scope: 'DIRECT',
              title: target.name,
              participantIds: [currentUser.id, target.id],
            });
          }
        }}
      />
    </div>
  );
};
