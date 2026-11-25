import Peer, { type MediaConnection } from 'peerjs';
import type { CallConnectionState, CallMode } from '../types';

export interface WebRtcCallCallbacks {
  onStateChange: (state: CallConnectionState, message: string) => void;
  onLocalStream: (stream: MediaStream | null) => void;
  onRemoteStream: (stream: MediaStream | null) => void;
  onScreenShareChange: (sharing: boolean) => void;
  onRawCameraTrackChange?: (track: MediaStreamTrack | null) => void;
}

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}

/**
 * WebRTC call controller with real browser camera/microphone acquisition,
 * screen sharing, camera track replacement, and PeerJS P2P signaling.
 * Designed so the signaling transport can be swapped cleanly for a dedicated
 * WebSocket + TURN/SFU server (LiveKit / Daily / Twilio / custom Node.js) in production.
 */
export class FamilyWebRtcController {
  private peer: Peer | null = null;
  private activeConnection: MediaConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private effectTrack: MediaStreamTrack | null = null;
  private facingMode: 'user' | 'environment' = 'user';
  private callbacks: WebRtcCallCallbacks;

  constructor(callbacks: WebRtcCallCallbacks) {
    this.callbacks = callbacks;
  }

  async start(roomCode: string, mode: CallMode, isHost: boolean): Promise<void> {
    this.callbacks.onStateChange(
      'REQUESTING_PERMISSIONS',
      mode === 'VIDEO'
        ? 'Solicitando permiso de cámara y micrófono…'
        : 'Solicitando permiso de micrófono…'
    );

    try {
      this.localStream = await this.acquireMedia(mode);
      this.cameraTrack = this.localStream.getVideoTracks()[0] ?? null;
      this.callbacks.onRawCameraTrackChange?.(this.cameraTrack);
      this.callbacks.onLocalStream(this.buildOutgoingStream());
    } catch (err) {
      const msg = this.explainPermissionError(err, mode);
      this.callbacks.onStateChange('ERROR', msg);
      return;
    }

    this.connectSignaling(roomCode, isHost);
  }

  private async acquireMedia(mode: CallMode): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Tu navegador no soporta captura WebRTC (usa HTTPS o localhost).');
    }
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          mode === 'VIDEO'
            ? { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
            : false,
      });
    } catch (err) {
      // Fallback to audio-only if video hardware is busy or missing
      if (mode === 'VIDEO') {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.callbacks.onStateChange(
          'RINGING',
          'Cámara ocupada o no disponible · continuando con audio.'
        );
        return audioOnly;
      }
      throw err;
    }
  }

  private explainPermissionError(err: unknown, mode: CallMode): string {
    const domErr = err as { name?: string; message?: string };
    if (domErr?.name === 'NotAllowedError' || domErr?.name === 'PermissionDeniedError') {
      return `Permiso denegado. Habilita ${
        mode === 'VIDEO' ? 'cámara y micrófono' : 'micrófono'
      } en el candado de la barra del navegador y vuelve a intentar.`;
    }
    if (domErr?.name === 'NotFoundError') {
      return 'No se detectó cámara ni micrófono conectados en este dispositivo.';
    }
    return domErr?.message || 'No se pudo acceder a los dispositivos multimedia.';
  }

  private connectSignaling(roomCode: string, isHost: boolean) {
    const cleanCode = roomCode.replace(/[^0-9A-Za-z]/g, '').slice(0, 12);
    const peerId = `nazco-sala-${cleanCode}`;
    const rtcConfig: RTCConfiguration = { iceServers: buildIceServers() };

    this.callbacks.onStateChange(
      isHost ? 'RINGING' : 'CONNECTING',
      isHost
        ? `Sala #${cleanCode} lista · esperando a que un familiar se una…`
        : `Conectando a la sala familiar #${cleanCode}…`
    );

    try {
      this.peer = isHost ? new Peer(peerId, { config: rtcConfig }) : new Peer({ config: rtcConfig });

      this.peer.on('open', () => {
        if (!isHost && this.localStream && this.peer) {
          const call = this.peer.call(peerId, this.buildOutgoingStream());
          this.wireMediaConnection(call);
        } else {
          this.callbacks.onStateChange(
            'RINGING',
            `Sala #${cleanCode} activa · comparte el código o espera a tu familia`
          );
        }
      });

      this.peer.on('call', (incoming) => {
        if (!this.localStream) return;
        incoming.answer(this.buildOutgoingStream());
        this.wireMediaConnection(incoming);
      });

      this.peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && isHost) {
          // Room already hosted by another relative — join it automatically
          this.peer?.destroy();
          this.peer = null;
          this.connectSignaling(cleanCode, false);
          return;
        }
        // Keep local preview alive in demo mode when offline/no peer yet
        this.callbacks.onStateChange(
          'RINGING',
          `Sala local #${cleanCode} lista (modo vista previa / esperando conexión P2P)`
        );
      });
    } catch {
      this.callbacks.onStateChange(
        'RINGING',
        `Sala local #${cleanCode} activa en modo demostración`
      );
    }
  }

  private wireMediaConnection(call: MediaConnection) {
    this.activeConnection = call;
    call.on('stream', (remote) => {
      this.callbacks.onRemoteStream(new MediaStream(remote.getTracks()));
      this.callbacks.onStateChange('CONNECTED', 'Conectado en vivo (WebRTC HD)');
    });
    call.on('close', () => {
      this.callbacks.onRemoteStream(null);
      this.callbacks.onStateChange('RINGING', 'El otro participante salió de la sala');
    });
    call.on('error', () => {
      this.callbacks.onStateChange('RINGING', 'Reconectando señal WebRTC…');
    });
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setCameraEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    if (this.effectTrack) {
      this.effectTrack.enabled = enabled;
    }
  }

  private buildOutgoingStream(): MediaStream {
    const audioTracks = this.localStream?.getAudioTracks() ?? [];
    const screenTrack = this.screenStream?.getVideoTracks()[0] ?? null;
    const videoTrack = screenTrack ?? this.effectTrack ?? this.cameraTrack;
    return new MediaStream([...(videoTrack ? [videoTrack] : []), ...audioTracks]);
  }

  async setEffectVideoTrack(track: MediaStreamTrack | null): Promise<void> {
    if (this.effectTrack === track) return;
    this.effectTrack = track;
    if (this.screenStream) return;
    const targetTrack = track ?? this.cameraTrack;
    if (targetTrack) {
      if (this.cameraTrack) {
        targetTrack.enabled = this.cameraTrack.enabled;
      }
      await this.replaceOutgoingVideoTrack(targetTrack);
    }
    this.callbacks.onLocalStream(this.buildOutgoingStream());
  }

  getFacingMode(): 'user' | 'environment' {
    return this.facingMode;
  }

  async toggleScreenShare(): Promise<boolean> {
    if (this.screenStream) {
      this.stopScreenShare();
      return false;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Compartir pantalla no está disponible en este navegador.');
    }
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const screenTrack = displayStream.getVideoTracks()[0];
    if (!screenTrack) return false;

    this.screenStream = displayStream;
    await this.replaceOutgoingVideoTrack(screenTrack);
    screenTrack.onended = () => {
      this.stopScreenShare();
    };
    this.callbacks.onLocalStream(new MediaStream([screenTrack, ...(this.localStream?.getAudioTracks() ?? [])]));
    this.callbacks.onScreenShareChange(true);
    return true;
  }

  stopScreenShare() {
    if (!this.screenStream) return;
    this.screenStream.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    const restoreTrack = this.effectTrack ?? this.cameraTrack;
    if (restoreTrack) {
      void this.replaceOutgoingVideoTrack(restoreTrack);
      this.callbacks.onLocalStream(this.buildOutgoingStream());
    }
    this.callbacks.onScreenShareChange(false);
  }

  async switchCamera(): Promise<void> {
    if (!this.localStream) return;
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    const next = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: this.facingMode },
      audio: false,
    });
    const newTrack = next.getVideoTracks()[0];
    if (!newTrack) return;

    const oldTrack = this.localStream.getVideoTracks()[0];
    if (oldTrack) {
      this.localStream.removeTrack(oldTrack);
      oldTrack.stop();
    }
    this.localStream.addTrack(newTrack);
    this.cameraTrack = newTrack;
    this.callbacks.onRawCameraTrackChange?.(newTrack);
    if (!this.effectTrack) {
      await this.replaceOutgoingVideoTrack(newTrack);
      this.callbacks.onLocalStream(this.buildOutgoingStream());
    }
  }

  private async replaceOutgoingVideoTrack(newTrack: MediaStreamTrack) {
    const pc = this.activeConnection?.peerConnection;
    if (!pc) return;
    const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  hangUp() {
    this.stopScreenShare();
    try {
      this.activeConnection?.close();
    } catch {
      // ignore
    }
    try {
      this.peer?.destroy();
    } catch {
      // ignore
    }
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.cameraTrack = null;
    this.effectTrack = null;
    this.activeConnection = null;
    this.peer = null;
    this.callbacks.onRawCameraTrackChange?.(null);
    this.callbacks.onLocalStream(null);
    this.callbacks.onRemoteStream(null);
    this.callbacks.onStateChange('ENDED', 'Llamada finalizada');
  }
}

export function generateFamilyRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
