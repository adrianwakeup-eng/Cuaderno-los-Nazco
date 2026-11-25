import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import type { CallMode } from '../types';
import { ensureFirebaseSession, firebaseAuth, firestoreDb } from './firebaseClient';

const FAMILY_ROOT = 'families/los_nazco';
const VAPID_PUBLIC_KEY =
  'BO-d-bdAO1q4fkpPgVri1YOR-KuUYirIJhFeMfXuAmgf6z40zpKkB61Kli_WueUkjmY4Y6bp3AjdY69D4cytYF0';
const PUSH_ENDPOINT_URL =
  'https://yqhcyjrmkibhoorziqvg.supabase.co/functions/v1/nazco-push-notify';

export interface StoredPushSubscription {
  id: string;
  memberId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: string;
  updatedAt: string;
}

export type PushSupportState = 'supported' | 'ios-needs-install' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function hashEndpoint(endpoint: string): string {
  let h = 2166136261;
  for (let i = 0; i < endpoint.length; i++) {
    h ^= endpoint.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `ps_${(h >>> 0).toString(36)}`;
}

function detectPlatformLabel(): string {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS PWA';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  return 'Web';
}

export function getPushSupportState(): PushSupportState {
  if (typeof window === 'undefined') return 'unsupported';
  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    Boolean((navigator as unknown as { standalone?: boolean }).standalone);

  if (isIos && !isStandalone) {
    return 'ios-needs-install';
  }
  if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
    return 'supported';
  }
  return 'unsupported';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

async function getActiveSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('./sw.js');
    }
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Requests browser push permission, subscribes this device with our VAPID public key,
 * and saves the subscription under families/los_nazco/push_subs/{subId}.
 */
export async function enableDevicePush(
  memberId: string,
  requestPrompt = true
): Promise<{ ok: boolean; error?: string }> {
  const support = getPushSupportState();
  if (support === 'ios-needs-install') {
    return {
      ok: false,
      error:
        'En iPhone debes instalar la app primero: toca Compartir → Añadir a pantalla de inicio, ábrela desde el ícono y vuelve a activar las notificaciones.',
    };
  }
  if (support === 'unsupported') {
    return {
      ok: false,
      error: 'Este navegador no soporta notificaciones Push en segundo plano.',
    };
  }

  let perm = Notification.permission;
  if (perm === 'default' && requestPrompt) {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return {
      ok: false,
      error:
        perm === 'denied'
          ? 'Bloqueaste las notificaciones en este navegador. Habilítalas en el candado de la barra de direcciones.'
          : 'Acepta el permiso de notificaciones para recibir avisos de llamadas fuera de la app.',
    };
  }

  const reg = await getActiveSwRegistration();
  if (!reg) {
    return {
      ok: false,
      error: 'No se pudo activar el Service Worker de notificaciones.',
    };
  }

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength
        ) as ArrayBuffer,
      });
    }

    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth = json.keys?.auth;
    if (!sub.endpoint || !p256dh || !auth) {
      return { ok: false, error: 'La suscripción Push del dispositivo vino incompleta.' };
    }

    await ensureFirebaseSession();
    const subId = `${memberId}_${hashEndpoint(sub.endpoint)}`.slice(0, 118);
    const record: StoredPushSubscription = {
      id: subId,
      memberId,
      endpoint: sub.endpoint,
      p256dh,
      auth,
      platform: detectPlatformLabel(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/push_subs`, subId), record);
    return { ok: true };
  } catch (err) {
    console.error('Push subscription error:', err);
    return {
      ok: false,
      error: 'No se pudo registrar este teléfono para notificaciones Push.',
    };
  }
}

/**
 * Dispatches real encrypted Web Push notifications via our Supabase Edge Function
 * to every registered device of targetMemberIds (waking closed / locked phones!).
 */
export async function dispatchPushNotification(params: {
  targetMemberIds: string[];
  excludeMemberId?: string;
  title: string;
  body: string;
  kind: 'CALL' | 'MESSAGE' | 'TEST';
  roomCode?: string;
  callMode?: CallMode;
  callId?: string;
  callerId?: string;
  callerName?: string;
}): Promise<{ sent: number; total: number }> {
  try {
    await ensureFirebaseSession();
    const idToken = await firebaseAuth.currentUser?.getIdToken();
    if (!idToken) return { sent: 0, total: 0 };

    const targets = params.targetMemberIds.filter((id) => id !== params.excludeMemberId);
    if (targets.length === 0) return { sent: 0, total: 0 };

    const subsSnap = await getDocs(collection(firestoreDb, `${FAMILY_ROOT}/push_subs`));
    const matched = subsSnap.docs
      .map((d) => d.data() as StoredPushSubscription)
      .filter((s) => targets.includes(s.memberId));

    if (matched.length === 0) return { sent: 0, total: 0 };

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const res = await fetch(PUSH_ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        subscriptions: matched.map((s) => ({
          id: s.id,
          endpoint: s.endpoint,
          p256dh: s.p256dh,
          auth: s.auth,
        })),
        title: params.title,
        body: params.body,
        url: baseUrl,
        kind: params.kind,
        roomCode: params.roomCode,
        callMode: params.callMode,
        callId: params.callId,
        callerId: params.callerId,
        callerName: params.callerName,
        tag:
          params.kind === 'CALL' && params.roomCode
            ? `nazco-call-${params.roomCode}`
            : `nazco-${params.kind.toLowerCase()}-${Date.now()}`,
      }),
    });

    if (!res.ok) return { sent: 0, total: matched.length };
    const result = (await res.json()) as { sent?: number; expiredIds?: string[] };

    // Clean up expired 410 Gone device subscriptions automatically
    if (Array.isArray(result.expiredIds) && result.expiredIds.length > 0) {
      await Promise.all(
        result.expiredIds.map((expId) =>
          deleteDoc(doc(firestoreDb, `${FAMILY_ROOT}/push_subs`, expId)).catch(() => {})
        )
      );
    }

    return { sent: result.sent ?? 0, total: matched.length };
  } catch (err) {
    console.error('dispatchPushNotification error:', err);
    return { sent: 0, total: 0 };
  }
}

export async function sendTestPushToSelf(memberId: string, memberName: string): Promise<boolean> {
  const qs = await getDocs(
    query(collection(firestoreDb, `${FAMILY_ROOT}/push_subs`), where('memberId', '==', memberId))
  );
  if (qs.empty) return false;
  const res = await dispatchPushNotification({
    targetMemberIds: [memberId],
    title: '🔔 ¡Notificaciones activas!',
    body: `Hola ${memberName.split(' ')[0]}, ya recibirás avisos de llamadas y mensajes aunque cierres la app 💛`,
    kind: 'TEST',
  });
  return res.sent > 0;
}

/** Gentle warm repeating ringtone via Web Audio API while an incoming call rings */
export function startIncomingRingtone(): () => void {
  let stopped = false;
  let intervalId: number | null = null;
  let audioCtx: AudioContext | null = null;

  const ringOnce = () => {
    if (stopped) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([260, 120, 260]);
      } catch {
        // ignore
      }
    }
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') void audioCtx.resume();
      const now = audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5 - E5 - G5 warm chord arpeggio
      notes.forEach((freq, idx) => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.11, now + idx * 0.14 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.36);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.38);
      });
    } catch {
      // autoplay blocked until first gesture
    }
  };

  ringOnce();
  intervalId = window.setInterval(ringOnce, 2200);

  return () => {
    stopped = true;
    if (intervalId !== null) window.clearInterval(intervalId);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch {
        // ignore
      }
    }
    if (audioCtx) {
      void audioCtx.close().catch(() => {});
      audioCtx = null;
    }
  };
}
