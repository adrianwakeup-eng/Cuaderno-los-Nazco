/**
 * Lightweight multi-tab real-time event bus using BroadcastChannel.
 * Lets you test live Messenger chats, typing indicators, posts, and Admin updates
 * across two browser tabs immediately — and mirrors the event contract used by
 * Supabase Realtime / Firebase onSnapshot / Socket.IO in production.
 */

export type RealtimeEvent =
  | { type: 'STATE_SYNC'; senderTabId: string; timestamp: number }
  | { type: 'TYPING'; senderTabId: string; chatId: string; userId: string; isTyping: boolean };

const CHANNEL_NAME = 'cuaderno_los_nazco_realtime_v1';
const TAB_ID = `tab_${Math.random().toString(36).slice(2, 10)}`;

class FamilyRealtimeBus {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev: MessageEvent<RealtimeEvent>) => {
        if (!ev.data || ev.data.senderTabId === TAB_ID) return;
        this.listeners.forEach((cb) => cb(ev.data));
      };
    }
  }

  publishStateSync() {
    this.channel?.postMessage({
      type: 'STATE_SYNC',
      senderTabId: TAB_ID,
      timestamp: Date.now(),
    } satisfies RealtimeEvent);
  }

  publishTyping(chatId: string, userId: string, isTyping: boolean) {
    this.channel?.postMessage({
      type: 'TYPING',
      senderTabId: TAB_ID,
      chatId,
      userId,
      isTyping,
    } satisfies RealtimeEvent);
  }

  subscribe(listener: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const realtimeBus = new FamilyRealtimeBus();
