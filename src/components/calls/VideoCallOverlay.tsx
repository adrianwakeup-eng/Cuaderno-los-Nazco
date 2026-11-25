import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Copy,
  LayoutGrid,
  Maximize2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  RefreshCw,
  Share2,
  ShieldAlert,
  Video,
  VideoOff,
} from 'lucide-react';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { FamilyWebRtcController } from '../../services/webrtcService';
import type { CallConnectionState } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';

export const VideoCallOverlay: React.FC = () => {
  const { snapshot, currentUser, activeCall, markCallRemoteConnected, endCall, notify } =
    useFamilyApp();

  const [connState, setConnState] = useState<CallConnectionState>('REQUESTING_PERMISSIONS');
  const [statusMessage, setStatusMessage] = useState('Preparando dispositivos…');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [viewMode, setViewMode] = useState<'SPOTLIGHT' | 'GRID'>('GRID');
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const controllerRef = useRef<FamilyWebRtcController | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const otherParticipants = useMemo(() => {
    if (!activeCall || !currentUser) return [];
    return snapshot.members.filter(
      (m) => activeCall.participantIds.includes(m.id) && m.id !== currentUser.id
    );
  }, [activeCall, snapshot.members, currentUser]);

  useEffect(() => {
    if (!activeCall) return;
    setCameraOn(activeCall.mode === 'VIDEO');
    setMuted(false);
    setScreenSharing(false);
    setElapsedSec(0);

    const ctrl = new FamilyWebRtcController({
      onStateChange: (state, msg) => {
        setConnState(state);
        setStatusMessage(msg);
      },
      onLocalStream: (stream) => setLocalStream(stream),
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
        markCallRemoteConnected();
      },
      onScreenShareChange: (sharing) => setScreenSharing(sharing),
    });
    controllerRef.current = ctrl;
    void ctrl.start(activeCall.roomCode, activeCall.mode, activeCall.isHost);

    const timer = window.setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
      ctrl.hangUp();
      controllerRef.current = null;
    };
  }, [activeCall?.id]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      void localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, viewMode, cameraOn]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      void remoteVideoRef.current.play().catch(() => {});
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      void remoteAudioRef.current.play().catch(() => {});
    }
  }, [remoteStream, viewMode]);

  if (!activeCall || !currentUser) return null;

  const formattedTime = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(
    elapsedSec % 60
  ).padStart(2, '0')}`;

  const handleCopyCode = () => {
    void navigator.clipboard?.writeText(activeCall.roomCode);
    setCopiedCode(true);
    notify(`Código de sala #${activeCall.roomCode} copiado.`, 'success');
    window.setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareInvite = async () => {
    const inviteUrl = new URL(window.location.href);
    inviteUrl.search = '';
    inviteUrl.searchParams.set('joinCall', activeCall.roomCode);
    inviteUrl.searchParams.set('mode', activeCall.mode);
    inviteUrl.searchParams.set('title', activeCall.title);
    const text = `📞 ${currentUser.name} te invita a una ${
      activeCall.mode === 'VIDEO' ? 'videollamada' : 'llamada'
    } en Cuaderno los Nazco (Sala #${activeCall.roomCode}): ${inviteUrl.toString()}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Llamada familiar · Cuaderno los Nazco',
          text,
          url: inviteUrl.toString(),
        });
        return;
      } catch {
        // cancelled
      }
    }
    void navigator.clipboard?.writeText(text);
    notify('Enlace directo a la llamada copiado · pégalo en WhatsApp 💛', 'success');
  };

  const canShareScreen =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');

  const overlay = (
    <div
      className="fixed inset-0 z-[90] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#16110E] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`Llamada activa: ${activeCall.title}`}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Call Header */}
      <header className="pt-safe flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-black/45 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connState === 'CONNECTED'
                ? 'bg-emerald-400'
                : connState === 'ERROR'
                  ? 'bg-red-500'
                  : 'animate-pulse bg-amber-400'
            }`}
          />
          <div>
            <h2 className="text-base font-bold">{activeCall.title}</h2>
            <p className="text-xs text-stone-300">
              {formattedTime} · {statusMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void handleShareInvite()}
            className="inline-flex items-center gap-1.5 rounded-full bg-brazil-500 px-3 py-1.5 text-xs font-bold text-white shadow transition hover:bg-brazil-600"
            title="Enviar enlace directo de llamada por WhatsApp o compartir"
          >
            <Share2 className="h-3.5 w-3.5 text-solar-200" />
            <span>Invitar</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 font-mono text-xs font-semibold text-amber-200 transition hover:bg-white/20"
          >
            <span>Sala #{activeCall.roomCode}</span>
            {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={() => setViewMode((m) => (m === 'GRID' ? 'SPOTLIGHT' : 'GRID'))}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/20"
            title="Cambiar vista"
          >
            {viewMode === 'GRID' ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Foco
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" /> Cuadrícula
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Video / Audio Stage */}
      <div className="relative min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {connState === 'ERROR' && (
          <div className="mx-auto mb-3 flex max-w-xl items-start gap-3 rounded-2xl border border-red-400/40 bg-red-950/60 p-3.5 text-sm text-red-100">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="font-bold">Permisos de cámara o micrófono requeridos</p>
              <p className="mt-1 text-xs text-red-200">{statusMessage}</p>
            </div>
          </div>
        )}

        <div
          className={`mx-auto grid h-full min-h-0 max-w-6xl auto-rows-fr gap-3 sm:gap-4 ${
            viewMode === 'SPOTLIGHT'
              ? 'grid-cols-1 lg:grid-cols-4'
              : remoteStream || otherParticipants.length <= 1
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {/* Remote Live WebRTC Stream Tile (when connected) */}
          {remoteStream && (
            <div
              className={`relative min-h-0 overflow-hidden rounded-3xl border border-emerald-400/40 bg-black ${
                viewMode === 'SPOTLIGHT' ? 'lg:col-span-3' : ''
              }`}
            >
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold">
                Familiar conectado en vivo
              </span>
            </div>
          )}

          {/* Local Camera / Screen Share Tile */}
          <div
            className={`relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-3xl border border-terracotta-500/40 bg-[#241B16] ${
              viewMode === 'SPOTLIGHT' && !remoteStream ? 'lg:col-span-3' : ''
            }`}
          >
            {localStream && (cameraOn || screenSharing) && localStream.getVideoTracks().length > 0 ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`h-full w-full object-cover ${screenSharing ? '' : '-scale-x-100'}`}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <MemberAvatar member={currentUser} size="xl" />
                <p className="text-sm font-semibold text-stone-200">
                  {activeCall.mode === 'AUDIO' ? 'Llamada de audio activa' : 'Cámara desactivada'}
                </p>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold">
              <span>Tú ({currentUser.name.split(' ')[0]})</span>
              {muted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
              {screenSharing && (
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px]">Pantalla</span>
              )}
            </div>
          </div>

          {/* Family Participants Waiting / Demo Preview Tiles */}
          {!remoteStream &&
            otherParticipants.slice(0, activeCall.scope === 'DIRECT' ? 1 : 4).map((member) => (
              <div
                key={member.id}
                className="relative flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#211A15] p-6 text-center"
              >
                <div className="rounded-full p-1 ring-2 ring-terracotta-500/40">
                  <MemberAvatar member={member} size="xl" showPresence />
                </div>
                <p className="mt-3 font-bold text-white">{member.name}</p>
                <p className="text-xs text-stone-400">
                  {member.relationship} · {member.location}
                </p>
                <span className="mt-2 rounded-full bg-white/10 px-3 py-1 text-[11px] text-amber-200">
                  Invitado · esperando en sala #{activeCall.roomCode}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Bottom Controls Bar — always pinned above system navigation / safe area */}
      <footer
        className="shrink-0 border-t border-white/15 bg-black/85 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-xl flex-wrap items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              controllerRef.current?.setMuted(next);
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition sm:h-13 sm:w-13 ${
              muted ? 'bg-red-600 text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
            aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {activeCall.mode === 'VIDEO' && (
            <>
              <button
                onClick={() => {
                  const next = !cameraOn;
                  setCameraOn(next);
                  controllerRef.current?.setCameraEnabled(next);
                }}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition sm:h-13 sm:w-13 ${
                  !cameraOn ? 'bg-red-600 text-white' : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title={cameraOn ? 'Apagar cámara' : 'Encender cámara'}
                aria-label={cameraOn ? 'Apagar cámara' : 'Encender cámara'}
              >
                {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>

              {canShareScreen && (
                <button
                  onClick={() => {
                    void controllerRef.current?.toggleScreenShare().catch((err: Error) => {
                      notify(err.message, 'warning');
                    });
                  }}
                  className={`hidden h-12 w-12 items-center justify-center rounded-full transition sm:flex sm:h-13 sm:w-13 ${
                    screenSharing
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                  title="Compartir pantalla"
                  aria-label="Compartir pantalla"
                >
                  <MonitorUp className="h-5 w-5" />
                </button>
              )}

              <button
                onClick={() => {
                  void controllerRef.current?.switchCamera().catch(() => {
                    notify('Solo se detectó una cámara disponible.', 'info');
                  });
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 sm:h-13 sm:w-13"
                title="Cambiar cámara"
                aria-label="Cambiar cámara"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            onClick={() => {
              controllerRef.current?.hangUp();
              endCall();
            }}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 text-sm font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-700 active:scale-95 sm:h-13"
          >
            <PhoneOff className="h-5 w-5" />
            Colgar
          </button>
        </div>
      </footer>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};
