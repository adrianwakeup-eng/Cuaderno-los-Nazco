import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JoyBurstItem } from '../components/shared/JoyBurstLayer';
import { clearOfflineReading, queuePushTutorial } from '../services/localFamilyPreferences';
import { familyRepository } from '../services/familyRepository';
import {
  firebaseSyncService,
  type CloudSyncState,
  type LiveCallSignal,
} from '../services/firebaseSyncService';
import {
  closeCallNotificationBanner,
  dispatchPushNotification,
  enableDevicePush,
  ensureSenderCircularAvatarMediaId,
  getNotificationPermission,
  getPushSupportState,
  sendTestPushToSelf,
  warmPushPipeline,
  type PushSupportState,
} from '../services/pushNotificationService';
import { realtimeBus } from '../services/realtimeBus';
import { computeStorageUsage, deleteMediaBlob } from '../services/storageService';
import { generateFamilyRoomCode } from '../services/webrtcService';
import type {
  AccountStatus,
  ActiveCallSession,
  AlbumPhotoItem,
  AppSection,
  CallMode,
  CallScope,
  ChatMessage,
  FamilyAppSnapshot,
  FamilyChat,
  FamilyInvite,
  FamilyMember,
  FamilyPost,
  FamilyStory,
  FeatureFlags,
  MediaAttachment,
  PostComment,
  ReactionKey,
  StorageUsageSummary,
} from '../types';

export interface ToastNotice {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'warning';
}

interface FamilyAppContextValue {
  snapshot: FamilyAppSnapshot;
  cloudStatus: CloudSyncState;
  pushEnabled: boolean;
  pushSupport: PushSupportState;
  enablePushNotifications: () => Promise<boolean>;
  testPushNotification: () => Promise<void>;
  cloudStories: FamilyStory[];
  cloudAlbumPhotos: AlbumPhotoItem[];
  incomingCall: LiveCallSignal | null;
  acceptIncomingCall: () => void;
  rejectIncomingCall: () => void;
  publishCloudStory: (story: FamilyStory) => void;
  publishCloudAlbumPhoto: (photo: AlbumPhotoItem) => void;
  /** Null when not signed in — shows the Welcome Login Screen on page load */
  currentUser: FamilyMember | null;
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  registerBackHandler: (handler: () => boolean) => () => void;
  viewedProfileId: string;
  openProfile: (memberId: string) => void;
  activeChatId: string;
  openChatWithMember: (memberId: string) => void;
  setActiveChatId: (chatId: string) => void;
  activeCall: ActiveCallSession | null;
  startCall: (params: {
    mode: CallMode;
    scope: CallScope;
    title: string;
    participantIds: string[];
    chatId?: string;
    roomCode?: string;
    isHost?: boolean;
  }) => void;
  markCallRemoteConnected: () => void;
  endCall: () => void;
  storageUsage: StorageUsageSummary;
  unreadMessageCount: number;
  toasts: ToastNotice[];
  joyBursts: JoyBurstItem[];
  triggerJoyBurst: (emoji: string, count?: number) => void;
  notify: (message: string, tone?: ToastNotice['tone']) => void;

  // Auth & Profiles
  loginFamilyMember: (identifier: string, password: string) => { ok: boolean; error?: string };
  loginAsAdminPasswordOnly: (password: string) => { ok: boolean; error?: string };
  logout: () => void;
  registerMember: (input: {
    name: string;
    username: string;
    email: string;
    password: string;
    relationship: string;
    location: string;
    bio: string;
    avatarUrl?: string;
    inviteCode?: string;
  }) => Promise<{ ok: boolean; error?: string; member?: FamilyMember }>;
  updateMemberProfile: (
    memberId: string,
    patch: Partial<
      Pick<
        FamilyMember,
        'name' | 'username' | 'email' | 'password' | 'relationship' | 'location' | 'bio' | 'avatarUrl' | 'coverUrl' | 'avatarColor'
      >
    >
  ) => Promise<boolean>;
  updateAdminPassword: (currentPassword: string, newPassword: string) => { ok: boolean; error?: string };

  // Feed
  createPost: (input: {
    text: string;
    category: FamilyPost['category'];
    attachments: MediaAttachment[];
    stickerId?: string;
    pinned?: boolean;
  }) => void;
  toggleReaction: (postId: string, emoji: ReactionKey) => void;
  addComment: (postId: string, text: string, parentId?: string | null, stickerId?: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  togglePinPost: (postId: string) => void;
  toggleFeaturePost: (postId: string) => void;
  toggleHidePost: (postId: string) => void;
  updatePostText: (postId: string, text: string) => void;
  deletePost: (postId: string) => void;

  // Messenger
  sendMessage: (chatId: string, text: string, attachment?: MediaAttachment, stickerId?: string) => Promise<boolean>;
  deleteMessage: (chatId: string, messageId: string) => void;
  markChatRead: (chat: FamilyChat) => void;
  notifyTyping: (chatId: string, isTyping: boolean) => void;
  createGroupChat: (title: string, description: string, participantIds: string[]) => FamilyChat;

  // Admin
  createInvite: (label: string, maxUses: number) => FamilyInvite;
  toggleInviteActive: (code: string) => void;
  setMemberStatus: (memberId: string, status: AccountStatus) => Promise<void>;
  refreshMembers: () => Promise<void>;
  deleteRetiredMember: (memberId: string) => Promise<void>;
  updateFeatureFlags: (patch: Partial<FeatureFlags>) => void;
  exportBackupJson: () => void;
  importBackupJson: (rawJson: string) => void;
  resetDemoData: () => void;
}

const FamilyAppContext = createContext<FamilyAppContextValue | null>(null);
const AVATAR_PALETTE = ['#164D32', '#047857', '#BA9254', '#16466C', '#10B981', '#7C3AED'];

export const FamilyAppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapshot, setSnapshot] = useState<FamilyAppSnapshot>(() => familyRepository.loadSnapshot());
  const [cloudStatus, setCloudStatus] = useState<CloudSyncState>('CONNECTING');
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    () => getNotificationPermission() === 'granted'
  );
  const pushSupport = useMemo(() => getPushSupportState(), []);
  const [cloudStories, setCloudStories] = useState<FamilyStory[]>([]);
  const [cloudAlbumPhotos, setCloudAlbumPhotos] = useState<AlbumPhotoItem[]>([]);
  const [liveCalls, setLiveCalls] = useState<LiveCallSignal[]>([]);
  const [deepLinkIncomingCall, setDeepLinkIncomingCall] = useState<LiveCallSignal | null>(null);
  const [dismissedCallIds, setDismissedCallIds] = useState<string[]>([]);

  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    const initial = familyRepository.loadSnapshot();
    const saved = familyRepository.loadActiveUserId();
    if (saved && initial.members.some((m) => m.id === saved && m.status === 'ACTIVE')) {
      return saved;
    }
    return null;
  });

  const [activeSection, setActiveSectionState] = useState<AppSection>('FEED');
  const activeSectionRef = useRef<AppSection>('FEED');
  const sectionHistoryRef = useRef<AppSection[]>(['FEED']);
  const backHandlersRef = useRef<Array<() => boolean>>([]);
  const lastBackPressAtRef = useRef<number>(0);
  const exitingRef = useRef<boolean>(false);

  const setActiveSection = useCallback((next: AppSection) => {
    setActiveSectionState((prev) => {
      if (prev !== next) {
        const stack = sectionHistoryRef.current;
        if (next === 'FEED') {
          sectionHistoryRef.current = ['FEED'];
        } else {
          sectionHistoryRef.current = [...stack.filter((s) => s !== next).slice(-8), next];
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      activeSectionRef.current = next;
      return next;
    });
  }, []);

  const registerBackHandler = useCallback((handler: () => boolean) => {
    backHandlersRef.current.push(handler);
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter((fn) => fn !== handler);
    };
  }, []);
  const [viewedProfileId, setViewedProfileId] = useState<string>('nazco_adrian');
  const [activeChatId, setActiveChatId] = useState<string>('chat_familia_general');
  const [activeCall, setActiveCall] = useState<ActiveCallSession | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [joyBursts, setJoyBursts] = useState<JoyBurstItem[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsageSummary>({
    totalBytes: 0,
    imageBytes: 0,
    videoBytes: 0,
    audioBytes: 0,
    fileCount: 0,
    quotaBytes: 500 * 1024 * 1024,
  });

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const notify = useCallback((message: string, tone: ToastNotice['tone'] = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const triggerJoyBurst = useCallback((emoji: string, count = 7) => {
    const batch: JoyBurstItem[] = Array.from({ length: count }, (_, idx) => ({
      id: `burst_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
      emoji,
      leftPct: 14 + Math.random() * 72,
      delayMs: idx * 65,
    }));
    setJoyBursts((prev) => [...prev, ...batch]);
    window.setTimeout(() => {
      const ids = new Set(batch.map((b) => b.id));
      setJoyBursts((prev) => prev.filter((b) => !ids.has(b.id)));
    }, 1900);
  }, []);

  // Hydrate local IndexedDB media first
  useEffect(() => {
    let alive = true;
    void familyRepository.hydrateMediaUrls(familyRepository.loadSnapshot()).then((hydrated) => {
      if (alive) setSnapshot(hydrated);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Real-time Firebase Cloud Firestore subscription across ALL family phones
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const connectCloud = () => {
      void firebaseSyncService.ensureCloudSeeded(familyRepository.loadSnapshot());

      unsubscribe = firebaseSyncService.subscribeAll({
        onStatus: setCloudStatus,
        onMeta: (meta) => {
          setSnapshot((prev) => {
            const next: FamilyAppSnapshot = {
              ...prev,
              familyName: meta.familyName || prev.familyName,
              cloudOwnerEmail: meta.cloudOwnerEmail || prev.cloudOwnerEmail,
              adminPassword: meta.adminPassword || prev.adminPassword,
              invites: Array.isArray(meta.invites) ? meta.invites : prev.invites,
              featureFlags: meta.featureFlags || prev.featureFlags,
            };
            familyRepository.saveSnapshot(next);
            return next;
          });
        },
        onMembers: (members) => {
          setSnapshot((prev) => {
            const normalized = members.map((m) => ({
              ...m,
              role: (m.id === 'nazco_adrian' ? 'ADMIN' : 'MEMBER') as FamilyMember['role'],
            }));
            const next = { ...prev, members: normalized };
            familyRepository.saveSnapshot(next);
            return next;
          });
        },
        onPosts: (posts) => {
          setSnapshot((prev) => {
            // Preserve live local blob: URLs for attachments that are still playing locally
            const prevBlobByAttId = new Map<string, string>();
            prev.posts.forEach((p) =>
              p.attachments.forEach((a) => {
                if (a.previewUrl?.startsWith('blob:')) prevBlobByAttId.set(a.id, a.previewUrl);
              })
            );
            const mergedPosts = posts.map((p) => ({
              ...p,
              attachments: p.attachments.map((a) =>
                !a.previewUrl && prevBlobByAttId.has(a.id)
                  ? { ...a, previewUrl: prevBlobByAttId.get(a.id) }
                  : a
              ),
            }));
            const next = { ...prev, posts: mergedPosts };
            familyRepository.saveSnapshot(next);
            return next;
          });
        },
        onChats: (chats) => {
          setSnapshot((prev) => {
            const next = { ...prev, chats };
            familyRepository.saveSnapshot(next);
            return next;
          });
        },
        onStories: setCloudStories,
        onAlbums: setCloudAlbumPhotos,
        onCalls: setLiveCalls,
      });
    };

    connectCloud();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Same-device cross-tab fallback sync
  useEffect(() => {
    return realtimeBus.subscribe((ev) => {
      if (ev.type === 'STATE_SYNC') {
        void familyRepository.hydrateMediaUrls(familyRepository.loadSnapshot()).then((hydrated) => {
          setSnapshot(hydrated);
        });
      } else if (ev.type === 'TYPING') {
        setSnapshot((prev) => ({
          ...prev,
          chats: prev.chats.map((chat) => {
            if (chat.id !== ev.chatId) return chat;
            const set = new Set(chat.typingUserIds);
            if (ev.isTyping) set.add(ev.userId);
            else set.delete(ev.userId);
            return { ...chat, typingUserIds: Array.from(set) };
          }),
        }));
      }
    });
  }, []);

  // Compute media usage
  useEffect(() => {
    const allAttachments: MediaAttachment[] = [
      ...snapshot.posts.flatMap((p) => p.attachments),
      ...snapshot.chats.flatMap((c) =>
        c.messages.map((m) => m.attachment).filter((a): a is MediaAttachment => Boolean(a))
      ),
    ];
    void computeStorageUsage(allAttachments, snapshot.featureFlags.storageQuotaMb).then(setStorageUsage);
  }, [snapshot.posts, snapshot.chats, snapshot.featureFlags.storageQuotaMb]);

  const commitSnapshot = useCallback((updater: (prev: FamilyAppSnapshot) => FamilyAppSnapshot) => {
    setSnapshot((prev) => {
      const next = updater(prev);
      familyRepository.saveSnapshot(next);
      realtimeBus.publishStateSync();
      return next;
    });
  }, []);

  const currentUser = useMemo(() => {
    if (!activeUserId) return null;
    const found = snapshot.members.find((m) => m.id === activeUserId && m.status === 'ACTIVE');
    return found ?? null;
  }, [snapshot.members, activeUserId]);

  const presenceMemberId = currentUser?.role === 'MEMBER' ? currentUser.id : null;
  const [presenceClock, setPresenceClock] = useState(Date.now);

  useEffect(() => {
    const updateClock = () => setPresenceClock(Date.now());
    const timer = window.setInterval(updateClock, 5_000);
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, []);

  useEffect(() => {
    if (!presenceMemberId || cloudStatus !== 'CONNECTED') return;
    const renewPresence = () => {
      if (!navigator.onLine) return;
      void firebaseSyncService.updateMemberFields(presenceMemberId, {
        presence: 'ONLINE',
        lastActiveAt: new Date().toISOString(),
      }).catch(() => {});
    };
    renewPresence();
    const timer = window.setInterval(renewPresence, 20_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') renewPresence();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', renewPresence);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', renewPresence);
    };
  }, [presenceMemberId, cloudStatus]);

  const visibleMembers = useMemo(() => snapshot.members.map((member) => {
    if (member.presence !== 'ONLINE') return member;
    const age = presenceClock - Date.parse(member.lastActiveAt || '');
    const connected = member.status === 'ACTIVE' && member.role !== 'ADMIN'
      && age >= -60_000 && age < 60_000;
    return connected ? member : { ...member, presence: 'OFFLINE' as const };
  }), [snapshot.members, presenceClock]);

  // Silently keep this device's Web Push subscription synced & pre-warm push pipeline + circular avatar
  // Ghost Admin never registers presence or push footprint so nobody knows the Admin is active.
  useEffect(() => {
    if (!currentUser || currentUser.role === 'ADMIN') return;
    warmPushPipeline();
    if (getNotificationPermission() === 'granted') {
      void enableDevicePush(currentUser.id, false).then((res) => {
        if (res.ok) setPushEnabled(true);
      });
    }
    void ensureSenderCircularAvatarMediaId({
      id: currentUser.id,
      name: currentUser.name,
      avatarUrl: currentUser.avatarUrl,
      avatarColor: currentUser.avatarColor,
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') warmPushPipeline();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [currentUser?.id, currentUser?.avatarUrl, currentUser?.name, currentUser?.avatarColor]);

  // Deep-link when user taps an incoming call Push Notification (?incomingCall=... or ?joinCall=...)
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const incomingRoom = params.get('incomingCall') || params.get('joinCall');
    if (!incomingRoom) return;

    const modeParam = params.get('mode') === 'AUDIO' ? 'AUDIO' : 'VIDEO';
    const titleParam = params.get('title') || `Llamada familiar #${incomingRoom}`;
    const callIdParam = params.get('callId') || `call_push_${Date.now()}`;
    const callerIdParam = params.get('callerId') || '';
    const callerNameParam = params.get('callerName') || titleParam.replace(/^[^a-zA-ZÀ-ÿ]+/, '');
    const autoAnswer = params.get('autoAnswer') === '1' || Boolean(params.get('joinCall'));

    // Clean query params so reloading later won't re-trigger (preserve history guard state)
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState(window.history.state, '', cleanUrl);

    if (autoAnswer) {
      void closeCallNotificationBanner(incomingRoom);
      if (params.get('callId')) {
        void firebaseSyncService.updateCallSignalStatus(callIdParam, 'ACCEPTED').catch(() => {});
      }
      setActiveCall({
        id: callIdParam,
        roomCode: incomingRoom,
        title: titleParam,
        mode: modeParam,
        scope: 'FAMILY_ROOM',
        participantIds: [currentUser.id],
        startedById: callerIdParam || currentUser.id,
        startedAt: new Date().toISOString(),
        isHost: false,
      });
    } else {
      // Show Contestar / Colgar screen first instead of jumping straight into the call!
      setDeepLinkIncomingCall({
        id: callIdParam,
        roomCode: incomingRoom,
        title: titleParam,
        mode: modeParam,
        scope: 'DIRECT',
        participantIds: [currentUser.id],
        startedById: callerIdParam,
        callerName: callerNameParam || 'Familiar',
        status: 'RINGING',
        createdAt: new Date().toISOString(),
      });
    }
  }, [currentUser?.id]);

  const enablePushNotifications = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
    const res = await enableDevicePush(currentUser.id, true);
    if (res.ok) {
      setPushEnabled(true);
      notify('🔔 ¡Listo! Recibirás avisos de llamadas y mensajes aunque cierres la app.', 'success');
      return true;
    }
    notify(res.error || 'No se pudieron activar las notificaciones.', 'warning');
    return false;
  }, [currentUser, notify]);

  const testPushNotification = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    const ok = await sendTestPushToSelf(
      currentUser.id,
      currentUser.name,
      currentUser.avatarUrl,
      currentUser.avatarColor
    );
    if (ok) {
      notify('Notificación de prueba enviada al servidor Push 🔔', 'success');
    } else {
      notify('Primero activa las notificaciones en este dispositivo.', 'warning');
    }
  }, [currentUser, notify]);

  // Live incoming call detected from Push Notification deep-link OR Firestore real-time ringing
  const incomingCall = useMemo(() => {
    if (!currentUser || activeCall) return null;
    if (deepLinkIncomingCall && !dismissedCallIds.includes(deepLinkIncomingCall.id)) {
      // If Firestore already marked this exact call as ENDED, clear it automatically
      const liveMatch = liveCalls.find((c) => c.id === deepLinkIncomingCall.id);
      if (liveMatch && liveMatch.status === 'ENDED') return null;
      return liveMatch ?? deepLinkIncomingCall;
    }
    const cutoff = Date.now() - 90_000;
    return (
      liveCalls.find(
        (c) =>
          c.status === 'RINGING' &&
          c.startedById !== currentUser.id &&
          c.participantIds.includes(currentUser.id) &&
          !dismissedCallIds.includes(c.id) &&
          new Date(c.createdAt).getTime() >= cutoff
      ) ?? null
    );
  }, [deepLinkIncomingCall, liveCalls, currentUser, activeCall, dismissedCallIds]);

  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const incomingCallRef = useRef(incomingCall);
  incomingCallRef.current = incomingCall;

  // Prevent accidental app exit on Android Back button:
  // 1) Closes open drawers/modals/chat threads first
  // 2) Navigates back to previous section / Muro
  // 3) On Muro, requires pressing Back twice within 1 second (1000 ms) to exit
  useEffect(() => {
    if (typeof window === 'undefined' || !window.history?.pushState) return;

    const currentState = window.history.state as { nazcoHistory?: string } | null;
    if (currentState?.nazcoHistory !== 'guard') {
      window.history.replaceState({ nazcoHistory: 'base' }, '');
      window.history.pushState({ nazcoHistory: 'guard' }, '');
    }

    const pushGuard = () => {
      try {
        window.history.pushState({ nazcoHistory: 'guard' }, '');
      } catch {
        // ignore restricted environments
      }
    };

    const handlePopState = () => {
      if (exitingRef.current) return;

      // 1. Protect active live call from accidental back swipe
      if (activeCallRef.current) {
        pushGuard();
        lastBackPressAtRef.current = 0;
        notify('Toca el botón rojo Colgar para salir de la llamada.', 'info');
        return;
      }

      // 2. Dismiss incoming ringing overlay if active
      if (incomingCallRef.current) {
        pushGuard();
        lastBackPressAtRef.current = 0;
        const inc = incomingCallRef.current;
        setDeepLinkIncomingCall(null);
        setDismissedCallIds((prev) => [...prev, inc.id]);
        if (inc.scope === 'DIRECT') {
          void firebaseSyncService.updateCallSignalStatus(inc.id, 'ENDED').catch(() => {});
        }
        return;
      }

      // 3. Let topmost open modal, drawer, lightbox, or mobile chat thread handle Back
      for (let i = backHandlersRef.current.length - 1; i >= 0; i--) {
        try {
          if (backHandlersRef.current[i]()) {
            pushGuard();
            lastBackPressAtRef.current = 0;
            return;
          }
        } catch {
          // continue
        }
      }

      // 4. Navigate back to previous section / home Muro before considering app exit
      if (activeSectionRef.current !== 'FEED') {
        const stack = sectionHistoryRef.current;
        stack.pop();
        const prevSection = stack[stack.length - 1] ?? 'FEED';
        activeSectionRef.current = prevSection;
        setActiveSectionState(prevSection);
        window.scrollTo({ top: 0, behavior: 'auto' });
        pushGuard();
        lastBackPressAtRef.current = 0;
        return;
      }

      // 5. Already on Muro: require two Back presses within 1 second (1000 ms) to close app
      const now = Date.now();
      if (now - lastBackPressAtRef.current <= 1000) {
        exitingRef.current = true;
        window.history.back();
        return;
      }

      lastBackPressAtRef.current = now;
      pushGuard();
      notify('Presiona atrás otra vez para salir', 'info');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [notify]);

  const unreadMessageCount = useMemo(() => {
    if (!currentUser) return 0;
    return snapshot.chats.reduce((acc, chat) => {
      if (!chat.participantIds.includes(currentUser.id)) return acc;
      const unreadInChat = chat.messages.filter(
        (m) => m.senderId !== currentUser.id && !m.readBy.includes(currentUser.id)
      ).length;
      return acc + unreadInChat;
    }, 0);
  }, [snapshot.chats, currentUser]);

  const openProfile = useCallback((memberId: string) => {
    setViewedProfileId(memberId);
    setActiveSection('PROFILE');
  }, []);

  const openChatWithMember = useCallback(
    (memberId: string) => {
      if (!currentUser) return;
      if (memberId === currentUser.id) {
        setActiveSection('MESSAGES');
        return;
      }
      const existing = snapshot.chats.find(
        (c) =>
          c.kind === 'DIRECT' &&
          c.participantIds.length === 2 &&
          c.participantIds.includes(currentUser.id) &&
          c.participantIds.includes(memberId)
      );
      if (existing) {
        setActiveChatId(existing.id);
        setActiveSection('MESSAGES');
        return;
      }
      const newChat: FamilyChat = {
        id: `chat_dm_${[currentUser.id, memberId].sort().join('_')}`,
        kind: 'DIRECT',
        participantIds: [currentUser.id, memberId],
        messages: [],
        typingUserIds: [],
        updatedAt: new Date().toISOString(),
      };
      commitSnapshot((prev) => ({
        ...prev,
        chats: [newChat, ...prev.chats.filter((c) => c.id !== newChat.id)],
      }));
      void firebaseSyncService.ensureChatCreated(newChat).catch(() => {});
      setActiveChatId(newChat.id);
      setActiveSection('MESSAGES');
    },
    [currentUser, snapshot.chats, commitSnapshot]
  );

  // --- Auth: Member login ---
  const loginFamilyMember = useCallback(
    (identifier: string, password: string): { ok: boolean; error?: string } => {
      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();
      if (!cleanId) return { ok: false, error: 'Escribe tu usuario o correo familiar.' };
      if (!cleanPass) return { ok: false, error: 'Ingresa tu contraseña personal.' };

      const target = snapshot.members.find(
        (m) =>
          m.id === identifier ||
          m.username.toLowerCase() === cleanId ||
          m.email.toLowerCase() === cleanId ||
          m.name.toLowerCase() === cleanId
      );

      if (!target) {
        return {
          ok: false,
          error: cloudStatus === 'CONNECTED'
            ? 'No encontramos ese usuario familiar. Comprueba que el registro se confirmó en la nube.'
            : 'Aún no pudimos consultar las cuentas de la familia. Revisa tu conexión e inténtalo de nuevo.',
        };
      }
      if (target.role === 'ADMIN') {
        return {
          ok: false,
          error: 'Para entrar como Administrador deja Correo familiar vacío e ingresa solo tu contraseña maestra.',
        };
      }
      if (target.status === 'DISABLED') {
        return { ok: false, error: 'Tu cuenta está desactivada por el Administrador.' };
      }
      if (target.password !== cleanPass) {
        return { ok: false, error: 'Contraseña incorrecta. Intenta nuevamente.' };
      }

      const updated: FamilyMember = {
        ...target,
        presence: 'ONLINE',
        lastActiveAt: new Date().toISOString(),
      };
      setActiveUserId(target.id);
      setViewedProfileId(target.id);
      setActiveSection('FEED');
      familyRepository.saveActiveUserId(target.id);
      commitSnapshot((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === target.id ? updated : m)),
      }));
      void firebaseSyncService.updateMemberFields(target.id, {
        presence: updated.presence,
        lastActiveAt: updated.lastActiveAt,
      }).catch(() => {});
      triggerJoyBurst('💛', 8);
      notify(`¡Bienvenido a casa, ${target.name.split(' ')[0]}!`, 'success');
      return { ok: true };
    },
    [snapshot.members, cloudStatus, commitSnapshot, triggerJoyBurst, notify]
  );

  // --- Auth: Sole Administrator login (PASSWORD ONLY — NO USERNAME) ---
  const loginAsAdminPasswordOnly = useCallback(
    (password: string): { ok: boolean; error?: string } => {
      const cleanPass = password.trim();
      if (!cleanPass) return { ok: false, error: 'Ingresa la contraseña de Administrador.' };
      if (cleanPass !== snapshot.adminPassword) {
        return { ok: false, error: 'Contraseña de Administrador incorrecta.' };
      }
      const adminMember =
        snapshot.members.find((m) => m.id === 'nazco_adrian') ??
        snapshot.members.find((m) => m.role === 'ADMIN');
      if (!adminMember) return { ok: false, error: 'Perfil administrador no encontrado.' };

      const updated: FamilyMember = {
        ...adminMember,
        role: 'ADMIN',
        status: 'ACTIVE',
        // Ghost Admin Mode: NEVER appear online to any family member
        presence: 'OFFLINE',
        lastActiveAt: adminMember.lastActiveAt,
      };
      setActiveUserId(adminMember.id);
      setViewedProfileId(
        snapshot.members.find((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN')?.id ?? adminMember.id
      );
      setActiveSection('FEED');
      familyRepository.saveActiveUserId(adminMember.id);
      commitSnapshot((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === adminMember.id ? updated : m)),
      }));
      void firebaseSyncService.saveMember(updated).catch(() => {});
      notify('👻 Modo Administrador Fantasma activo · invisible para la familia', 'info');
      return { ok: true };
    },
    [snapshot.adminPassword, snapshot.members, commitSnapshot, triggerJoyBurst, notify]
  );

  const logout = useCallback(() => {
    clearOfflineReading();
    if (currentUser) {
      const offlineMember: FamilyMember = {
        ...currentUser,
        presence: 'OFFLINE',
        lastActiveAt: new Date().toISOString(),
      };
      void firebaseSyncService.updateMemberFields(offlineMember.id, {
        presence: offlineMember.presence,
        lastActiveAt: offlineMember.lastActiveAt,
      }).catch(() => {});
    }
    setActiveCall(null);
    setActiveUserId(null);
    setActiveSection('FEED');
    familyRepository.saveActiveUserId(null);
    notify('Sesión cerrada. ¡Vuelve pronto!', 'info');
  }, [currentUser, notify]);

  const registerMember = useCallback(
    async (input: {
      name: string;
      username: string;
      email: string;
      password: string;
      relationship: string;
      location: string;
      bio: string;
      avatarUrl?: string;
      inviteCode?: string;
    }): Promise<{ ok: boolean; error?: string; member?: FamilyMember }> => {
      const cleanName = input.name.trim();
      const cleanUsername = input.username.trim().toLowerCase().replace(/\s+/g, '');
      const cleanEmail =
        input.email.trim().toLowerCase() || `${cleanUsername || 'familiar'}@losnazco.familia`;
      const cleanPassword = input.password.trim();

      if (cleanName.length < 2) return { ok: false, error: 'Escribe tu nombre completo.' };
      if (cleanUsername.length < 3) {
        return { ok: false, error: 'El usuario debe tener al menos 3 letras o números.' };
      }
      if (cleanPassword.length < 4) {
        return { ok: false, error: 'Crea una contraseña de al menos 4 caracteres.' };
      }
      const matchesAccount = (m: FamilyMember) =>
        m.username.toLowerCase() === cleanUsername || m.email.toLowerCase() === cleanEmail;
      const localAccount = snapshot.members.find((m) =>
        matchesAccount(m) && m.role === 'MEMBER' && m.status === 'ACTIVE' &&
        m.username.toLowerCase() === cleanUsername && m.email.toLowerCase() === cleanEmail &&
        m.password === cleanPassword
      );

      const cleanCode = input.inviteCode?.trim().toUpperCase();
      const matchedInvite = cleanCode
        ? snapshot.invites.find((inv) => inv.code === cleanCode && inv.active && inv.uses < inv.maxUses)
        : undefined;

      const candidate: FamilyMember = {
        id: `nazco_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        relationship: input.relationship.trim() || 'Familiar',
        location: input.location.trim(),
        bio: input.bio.trim() || 'Feliz de estar en Cuaderno Social de la Familia 💛',
        role: 'MEMBER',
        status: 'ACTIVE',
        presence: 'ONLINE',
        avatarColor: AVATAR_PALETTE[snapshot.members.length % AVATAR_PALETTE.length],
        avatarUrl: input.avatarUrl,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

      let member: FamilyMember;
      try {
        const cloudMembers = await firebaseSyncService.refreshMembers();
        if (cloudMembers.some(matchesAccount)) {
          return { ok: false, error: 'Ese usuario o correo ya existe en la nube. Inicia sesión con esa cuenta.' };
        }
        if (snapshot.members.some(matchesAccount) && !localAccount) {
          return { ok: false, error: 'Ese usuario o correo ya existe en este dispositivo.' };
        }
        member = await firebaseSyncService.confirmMemberRegistration(localAccount ?? candidate);
      } catch (error) {
        const code = (error as { code?: string }).code;
        return {
          ok: false,
          error: code === 'permission-denied'
            ? 'La nube rechazó el registro. Prueba sin foto de perfil o avisa al administrador.'
            : 'No pudimos confirmar la cuenta en la nube. Tus datos siguen en el formulario. Revisa tu conexión y reintenta.',
        };
      }

      const generalChat = snapshot.chats.find((c) => c.id === 'chat_familia_general');
      const updatedGeneralChat = generalChat
        ? {
            ...generalChat,
            participantIds: Array.from(new Set([...generalChat.participantIds, member.id])),
          }
        : null;

      commitSnapshot((prev) => {
        const next: FamilyAppSnapshot = {
          ...prev,
          members: [...prev.members.filter((item) => item.id !== member.id), member],
          invites: matchedInvite
            ? prev.invites.map((inv) =>
                inv.code === matchedInvite.code
                  ? { ...inv, uses: inv.uses + 1, active: inv.uses + 1 < inv.maxUses }
                  : inv
              )
            : prev.invites,
          chats: prev.chats.map((chat) =>
            chat.id === 'chat_familia_general' && updatedGeneralChat ? updatedGeneralChat : chat
          ),
        };
        if (matchedInvite) void firebaseSyncService.saveMetaConfig(next).catch(() => {});
        return next;
      });

      if (updatedGeneralChat) void firebaseSyncService.addChatParticipant(updatedGeneralChat.id, member.id).catch(() => {});

      queuePushTutorial(member.id);
      setActiveUserId(member.id);
      setViewedProfileId(member.id);
      setActiveSection('FEED');
      familyRepository.saveActiveUserId(member.id);
      triggerJoyBurst('🎉', 10);
      notify(`¡Cuenta creada en la nube! Bienvenido, ${member.name}!`, 'success');
      return { ok: true, member };
    },
    [snapshot.members, snapshot.invites, snapshot.chats, commitSnapshot, triggerJoyBurst, notify]
  );

  const updateMemberProfile = useCallback(
    async (
      memberId: string,
      patch: Partial<
        Pick<
          FamilyMember,
          'name' | 'username' | 'email' | 'password' | 'relationship' | 'location' | 'bio' | 'avatarUrl' | 'coverUrl' | 'avatarColor'
        >
      >
    ) => {
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== memberId)) return false;
      try {
        await firebaseSyncService.updateMemberFields(memberId, patch);
        commitSnapshot((prev) => ({
          ...prev,
          members: prev.members.map((member) => member.id === memberId ? { ...member, ...patch } : member),
        }));
        notify('Perfil actualizado en la nube.', 'success');
        return true;
      } catch {
        notify('La nube no confirmó los cambios del perfil.', 'warning');
        return false;
      }
    },
    [currentUser, commitSnapshot, notify]
  );

  const updateAdminPassword = useCallback(
    (currentPassword: string, newPassword: string): { ok: boolean; error?: string } => {
      if (currentPassword.trim() !== snapshot.adminPassword) {
        return { ok: false, error: 'La contraseña actual de Administrador no coincide.' };
      }
      const cleanNew = newPassword.trim();
      if (cleanNew.length < 4) {
        return { ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' };
      }
      commitSnapshot((prev) => {
        const next: FamilyAppSnapshot = {
          ...prev,
          adminPassword: cleanNew,
          members: prev.members.map((m) =>
            m.id === 'nazco_adrian' ? { ...m, password: cleanNew } : m
          ),
        };
        void firebaseSyncService.saveMetaConfig(next).catch(() => {});
        const adrian = next.members.find((m) => m.id === 'nazco_adrian');
        if (adrian) void firebaseSyncService.saveMember(adrian).catch(() => {});
        return next;
      });
      notify('Contraseña de Administrador actualizada en la nube.', 'success');
      return { ok: true };
    },
    [snapshot.adminPassword, commitSnapshot, notify]
  );

  // --- Feed Actions (Cloud Real-Time Synced) ---
  const createPost = useCallback(
    (input: {
      text: string;
      category: FamilyPost['category'];
      attachments: MediaAttachment[];
      stickerId?: string;
      pinned?: boolean;
    }) => {
      if (!currentUser) return;
      const post: FamilyPost = {
        id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        authorId: currentUser.id,
        text: input.text.trim(),
        category: input.category,
        attachments: input.attachments,
        stickerId: input.stickerId,
        reactions: { '❤️': [], '🥰': [], '🥹': [], '👏': [], '😂': [], '🎉': [], '🙏': [] },
        comments: [],
        pinned: Boolean(input.pinned && currentUser.role === 'ADMIN'),
        featured: Boolean(input.pinned && currentUser.role === 'ADMIN'),
        hidden: false,
        createdAt: new Date().toISOString(),
      };
      commitSnapshot((prev) => ({
        ...prev,
        posts: [post, ...prev.posts],
      }));
      const hasVideo = input.attachments.some((a) => a.kind === 'VIDEO');
      if (hasVideo) {
        notify('Subiendo video a la nube familiar para todos los teléfonos… 🎬', 'info');
      }
      void firebaseSyncService
        .savePost(post)
        .then(() => {
          if (hasVideo) {
            notify('¡Video sincronizado en la nube! Ya se puede reproducir en todos los teléfonos 🎬✨', 'success');
          }
        })
        .catch((err) => {
          console.error('Firestore savePost failed:', err);
          notify('No se pudo subir el archivo completo a la nube (máx. 25 MB).', 'warning');
        });
      triggerJoyBurst(input.category === 'ANNOUNCEMENT' ? '🎉' : '❤️', 8);
      notify(
        post.pinned
          ? 'Publicación fijada en la nube familiar ✨'
          : '¡Recuerdo compartido en tiempo real con toda la familia!',
        'success'
      );
    },
    [currentUser, commitSnapshot, triggerJoyBurst, notify]
  );

  const toggleReaction = useCallback(
    (postId: string, emoji: ReactionKey) => {
      if (!currentUser) return;
      let added = false;
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((post) => {
          if (post.id !== postId) return post;
          const existing = post.reactions[emoji] ?? [];
          const has = existing.includes(currentUser.id);
          if (!has) added = true;
          const updated: FamilyPost = {
            ...post,
            reactions: {
              ...post.reactions,
              [emoji]: has
                ? existing.filter((id) => id !== currentUser.id)
                : [...existing, currentUser.id],
            },
          };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
      if (added) triggerJoyBurst(emoji, 6);
    },
    [currentUser, commitSnapshot, triggerJoyBurst]
  );

  const addComment = useCallback(
    (postId: string, text: string, parentId: string | null = null, stickerId?: string) => {
      if (!currentUser) return;
      const clean = text.trim();
      if (!clean && !stickerId) return;
      const comment: PostComment = {
        id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        postId,
        parentId,
        authorId: currentUser.id,
        text: clean,
        stickerId,
        createdAt: new Date().toISOString(),
      };
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((post) => {
          if (post.id !== postId) return post;
          const updated = { ...post, comments: [...post.comments, comment] };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
      if (stickerId) triggerJoyBurst('✨', 4);
    },
    [currentUser, commitSnapshot, triggerJoyBurst]
  );

  const deleteComment = useCallback(
    (postId: string, commentId: string) => {
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((post) => {
          if (post.id !== postId) return post;
          const updated = {
            ...post,
            comments: post.comments.filter((c) => c.id !== commentId && c.parentId !== commentId),
          };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
      notify('Comentario eliminado.', 'info');
    },
    [commitSnapshot, notify]
  );

  const togglePinPost = useCallback(
    (postId: string) => {
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== postId) return p;
          const updated = { ...p, pinned: !p.pinned };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
    },
    [commitSnapshot]
  );

  const updatePostText = useCallback(
    (postId: string, text: string) => {
      if (!currentUser) return;
      const clean = text.trim();
      if (!clean) return;
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== postId) return p;
          if (p.authorId !== currentUser.id && currentUser.role !== 'ADMIN') return p;
          const updated = { ...p, text: clean };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
      notify('Publicación actualizada ✨', 'success');
    },
    [currentUser, commitSnapshot, notify]
  );

  const toggleFeaturePost = useCallback(
    (postId: string) => {
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== postId) return p;
          const updated = { ...p, featured: !p.featured };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
    },
    [commitSnapshot]
  );

  const toggleHidePost = useCallback(
    (postId: string) => {
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.map((p) => {
          if (p.id !== postId) return p;
          const updated = { ...p, hidden: !p.hidden };
          void firebaseSyncService.savePost(updated).catch(() => {});
          return updated;
        }),
      }));
    },
    [commitSnapshot]
  );

  const deletePost = useCallback(
    (postId: string) => {
      const target = snapshotRef.current.posts.find((p) => p.id === postId);
      target?.attachments.forEach((a) => {
        if (a.storageKey) void deleteMediaBlob(a.storageKey);
      });
      commitSnapshot((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p.id !== postId),
      }));
      void firebaseSyncService.deletePost(postId).catch(() => {});
      notify('Publicación eliminada del cuaderno.', 'info');
    },
    [commitSnapshot, notify]
  );

  // --- Stories & Albums Cloud Publishing ---
  const publishCloudStory = useCallback((story: FamilyStory) => {
    setCloudStories((prev) => [story, ...prev.filter((s) => s.id !== story.id)]);
    void firebaseSyncService.saveStory(story).catch(() => {});
  }, []);

  const publishCloudAlbumPhoto = useCallback((photo: AlbumPhotoItem) => {
    setCloudAlbumPhotos((prev) => [photo, ...prev.filter((p) => p.id !== photo.id)]);
    void firebaseSyncService.saveAlbumPhoto(photo).catch(() => {});
  }, []);

  // --- Messenger Actions (Cloud Real-Time Synced) ---
  const sendMessage = useCallback(
    (chatId: string, text: string, attachment?: MediaAttachment, stickerId?: string) => {
      const chat = snapshot.chats.find((item) => item.id === chatId);
      const clean = text.trim();
      if (!currentUser || !chat || (!clean && !attachment && !stickerId)) return Promise.resolve(false);
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        chatId,
        senderId: currentUser.id,
        text: clean,
        attachment,
        stickerId,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.id],
      };
      return firebaseSyncService.appendChatMessage(chat, message).then(() => {
        if (stickerId) triggerJoyBurst('💕', 4);
        void dispatchPushNotification({
          targetMemberIds: chat.participantIds,
          excludeMemberId: currentUser.id,
          title: chat.kind === 'GROUP'
            ? `💬 ${currentUser.name.split(' ')[0]} en ${chat.title || 'Familia'}`
            : `💬 ${currentUser.name}`,
          body: clean || (attachment?.kind === 'AUDIO' ? '🎙️ Nota de voz' :
            attachment?.kind === 'IMAGE' ? '📷 Envió una foto' : '✨ Envió un sticker'),
          kind: 'MESSAGE',
          chatId,
          messageKind: attachment?.kind === 'AUDIO' ? 'AUDIO' : attachment?.kind === 'IMAGE' ? 'IMAGE' : attachment?.kind === 'VIDEO' ? 'VIDEO' : 'TEXT',
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            avatarColor: currentUser.avatarColor,
          },
        });
        return true;
      }, () => {
        notify('No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.', 'warning');
        return false;
      });
    },
    [currentUser, snapshot.chats, triggerJoyBurst, notify]
  );

  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    const message = snapshot.chats.find((chat) => chat.id === chatId)?.messages.find((item) => item.id === messageId);
    if (!currentUser || !message || (message.senderId !== currentUser.id && currentUser.role !== 'ADMIN')) return;
    void firebaseSyncService.deleteChatMessage(chatId, messageId).then(() => {
      if (message.attachment?.storageKey) void deleteMediaBlob(message.attachment.storageKey).catch(() => {});
      notify('Mensaje eliminado.', 'info');
    }, () => notify('No se pudo eliminar el mensaje.', 'warning'));
  }, [currentUser, snapshot.chats, notify]);

  const receiptWrites = useRef(new Set<string>());
  const confirmMessages = useCallback((chat: FamilyChat, read: boolean) => {
    const memberId = currentUser?.id;
    if (!memberId || currentUser.role === 'ADMIN' || !chat.participantIds.includes(memberId)) return;
    const pending = chat.messages.filter((message) =>
      message.senderId !== memberId && !(message.readBy ?? []).includes(memberId) &&
      (read || !(message.deliveredTo ?? []).includes(memberId))
    );
    if (!pending.length) return;
    const key = JSON.stringify([memberId, chat.id, read, ...pending.map((message) => message.id)]);
    if (receiptWrites.current.has(key)) return;
    receiptWrites.current.add(key);
    void firebaseSyncService.confirmChatMessages(chat.id, memberId, pending.map((message) => message.id), read)
      .catch(() => {})
      .finally(() => receiptWrites.current.delete(key));
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    const confirmDelivery = () => snapshot.chats.forEach((chat) => confirmMessages(chat, false));
    confirmDelivery();
    window.addEventListener('online', confirmDelivery);
    return () => window.removeEventListener('online', confirmDelivery);
  }, [snapshot.chats, confirmMessages]);

  const markChatRead = useCallback((chat: FamilyChat) => confirmMessages(chat, true), [confirmMessages]);

  const notifyTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      // Ghost Admin never broadcasts typing indicators
      if (!currentUser || currentUser.role === 'ADMIN') return;
      realtimeBus.publishTyping(chatId, currentUser.id, isTyping);
    },
    [currentUser]
  );

  const createGroupChat = useCallback(
    (title: string, description: string, participantIds: string[]): FamilyChat => {
      const myId = currentUser?.id ?? 'nazco_adrian';
      const chat: FamilyChat = {
        id: `chat_grp_${Date.now()}`,
        kind: 'GROUP',
        title: title.trim() || 'Nuevo grupo familiar',
        description: description.trim(),
        participantIds: Array.from(new Set([myId, ...participantIds])),
        messages: [],
        typingUserIds: [],
        updatedAt: new Date().toISOString(),
      };
      commitSnapshot((prev) => ({
        ...prev,
        chats: [chat, ...prev.chats],
      }));
      void firebaseSyncService.saveChat(chat).catch(() => {});
      setActiveChatId(chat.id);
      notify(`Grupo "${chat.title}" creado en la nube 🎉`, 'success');
      return chat;
    },
    [currentUser, commitSnapshot, notify]
  );

  // --- Calls with Real-Time Cross-Phone Cloud Ringing (Continuous Push Ring until Answered/Hung Up) ---
  const outgoingRingRef = useRef<{
    callId: string;
    roomCode: string;
    timerId: number | null;
    payload: Parameters<typeof dispatchPushNotification>[0];
  } | null>(null);

  const stopOutgoingRing = useCallback(() => {
    if (outgoingRingRef.current?.timerId !== null && outgoingRingRef.current?.timerId !== undefined) {
      window.clearInterval(outgoingRingRef.current.timerId);
    }
    outgoingRingRef.current = null;
  }, []);

  // Stop repeating call push pulses the moment Firestore signals ACCEPTED or ENDED
  useEffect(() => {
    const activeRing = outgoingRingRef.current;
    if (!activeRing) return;
    const live = liveCalls.find((c) => c.id === activeRing.callId);
    if (!live) return;
    if (live.status === 'ACCEPTED') {
      stopOutgoingRing();
    } else if (live.status === 'ENDED') {
      stopOutgoingRing();
      notify('La llamada fue colgada.', 'info');
    }
  }, [liveCalls, stopOutgoingRing, notify]);

  // Dismiss any lingering OS call notification once the in-app Contestar/Colgar modal is open
  useEffect(() => {
    if (incomingCall?.roomCode) {
      void closeCallNotificationBanner(incomingCall.roomCode);
    }
  }, [incomingCall?.roomCode]);

  useEffect(() => {
    return () => stopOutgoingRing();
  }, [stopOutgoingRing]);

  const startCall = useCallback(
    (params: {
      mode: CallMode;
      scope: CallScope;
      title: string;
      participantIds: string[];
      chatId?: string;
      roomCode?: string;
      isHost?: boolean;
    }) => {
      if (!currentUser) return;
      if (!snapshot.featureFlags.videoCallsEnabled) {
        notify('Las videollamadas están desactivadas temporalmente desde el Panel Admin.', 'warning');
        return;
      }
      stopOutgoingRing();
      const callId = `call_${Date.now()}`;
      const roomCode = params.roomCode?.trim() || generateFamilyRoomCode();
      const isHost = params.isHost ?? true;
      const nowIso = new Date().toISOString();

      setActiveCall({
        id: callId,
        roomCode,
        title: params.title,
        mode: params.mode,
        scope: params.scope,
        chatId: params.chatId,
        participantIds: params.participantIds,
        startedById: currentUser.id,
        startedAt: nowIso,
        isHost,
      });

      // Notify all invited family phones in real time via Firestore + repeating closed-app Web Push!
      if (isHost) {
        const signal: LiveCallSignal = {
          id: callId,
          roomCode,
          title: params.title,
          mode: params.mode,
          scope: params.scope,
          chatId: params.chatId,
          participantIds: params.participantIds,
          startedById: currentUser.id,
          callerName: currentUser.name,
          status: 'RINGING',
          createdAt: nowIso,
        };
        void firebaseSyncService.publishCallSignal(signal).catch(() => {});

        const pushPayload: Parameters<typeof dispatchPushNotification>[0] = {
          targetMemberIds: params.participantIds,
          excludeMemberId: currentUser.id,
          title:
            params.mode === 'VIDEO'
              ? `📹 Videollamada de ${currentUser.name}`
              : `📞 Llamada de ${currentUser.name}`,
          body: 'Toca para contestar o colgar en Cuaderno Social de la Familia',
          kind: 'CALL',
          roomCode,
          callMode: params.mode,
          callId,
          callerId: currentUser.id,
          callerName: currentUser.name,
          sender: {
            id: currentUser.id,
            name: currentUser.name,
            avatarUrl: currentUser.avatarUrl,
            avatarColor: currentUser.avatarColor,
          },
        };

        // First ring immediately + keep ringing every 3.8s (up to ~45s) until answered or hung up
        void dispatchPushNotification(pushPayload);
        let ringsSent = 1;
        const MAX_RINGS = 12;
        const timerId = window.setInterval(() => {
          if (outgoingRingRef.current?.callId !== callId) {
            window.clearInterval(timerId);
            return;
          }
          if (ringsSent >= MAX_RINGS) {
            stopOutgoingRing();
            return;
          }
          ringsSent += 1;
          void dispatchPushNotification(pushPayload);
        }, 3800);

        outgoingRingRef.current = {
          callId,
          roomCode,
          timerId,
          payload: pushPayload,
        };
      }
    },
    [snapshot.featureFlags.videoCallsEnabled, currentUser, notify, stopOutgoingRing]
  );

  const markCallRemoteConnected = useCallback(() => {
    stopOutgoingRing();
    if (activeCallRef.current) {
      void firebaseSyncService.updateCallSignalStatus(activeCallRef.current.id, 'ACCEPTED').catch(() => {});
    }
  }, [stopOutgoingRing]);

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !currentUser) return;
    void closeCallNotificationBanner(incomingCall.roomCode);
    setDeepLinkIncomingCall(null);
    setDismissedCallIds((prev) => [...prev, incomingCall.id]);
    void firebaseSyncService.updateCallSignalStatus(incomingCall.id, 'ACCEPTED').catch(() => {});
    setActiveCall({
      id: incomingCall.id,
      roomCode: incomingCall.roomCode,
      title: incomingCall.title,
      mode: incomingCall.mode,
      scope: incomingCall.scope,
      chatId: incomingCall.chatId,
      participantIds: incomingCall.participantIds,
      startedById: incomingCall.startedById,
      startedAt: incomingCall.createdAt,
      isHost: false,
    });
  }, [incomingCall, currentUser]);

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    void closeCallNotificationBanner(incomingCall.roomCode);
    setDeepLinkIncomingCall(null);
    setDismissedCallIds((prev) => [...prev, incomingCall.id]);
    if (incomingCall.scope === 'DIRECT') {
      void firebaseSyncService.updateCallSignalStatus(incomingCall.id, 'ENDED').catch(() => {});
    }
    notify('Llamada colgada.', 'info');
  }, [incomingCall, notify]);

  const endCall = useCallback(() => {
    const pendingRing = outgoingRingRef.current;
    stopOutgoingRing();
    if (activeCall) {
      void firebaseSyncService.updateCallSignalStatus(activeCall.id, 'ENDED').catch(() => {});
      // If caller hung up while receiver's phone was still ringing, stop the push ring cleanly
      if (pendingRing && pendingRing.callId === activeCall.id && currentUser) {
        void dispatchPushNotification({
          ...pendingRing.payload,
          kind: 'CALL_CANCEL',
          title: `📵 Llamada perdida de ${currentUser.name}`,
          body: 'Intentó llamarte en Cuaderno Social de la Familia',
        });
      }
    }
    setActiveCall(null);
  }, [activeCall, currentUser, stopOutgoingRing]);

  // --- Admin ---
  const createInvite = useCallback(
    (label: string, maxUses: number): FamilyInvite => {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const invite: FamilyInvite = {
        code: `NAZCO-${suffix}-${new Date().getFullYear()}`,
        label: label.trim() || 'Invitación familiar',
        assignedRole: 'MEMBER',
        createdBy: currentUser?.id ?? 'nazco_adrian',
        createdAt: new Date().toISOString(),
        active: true,
        uses: 0,
        maxUses: Math.max(1, Math.min(50, maxUses)),
      };
      commitSnapshot((prev) => {
        const next = { ...prev, invites: [invite, ...prev.invites] };
        void firebaseSyncService.saveMetaConfig(next).catch(() => {});
        return next;
      });
      notify(`Código ${invite.code} creado en la nube.`, 'success');
      return invite;
    },
    [currentUser, commitSnapshot, notify]
  );

  const toggleInviteActive = useCallback(
    (code: string) => {
      commitSnapshot((prev) => {
        const next = {
          ...prev,
          invites: prev.invites.map((inv) =>
            inv.code === code ? { ...inv, active: !inv.active } : inv
          ),
        };
        void firebaseSyncService.saveMetaConfig(next).catch(() => {});
        return next;
      });
    },
    [commitSnapshot]
  );

  const refreshMembers = useCallback(async () => {
    if (currentUser?.role !== 'ADMIN') return;
    const members = await firebaseSyncService.refreshMembers();
    commitSnapshot((prev) => ({ ...prev, members }));
  }, [currentUser?.role, commitSnapshot]);

  const deleteRetiredMember = useCallback(async (memberId: string) => {
    if (currentUser?.role !== 'ADMIN') throw new Error('admin-required');
    await firebaseSyncService.deleteRetiredMember(memberId);
    commitSnapshot((prev) => ({
      ...prev,
      members: prev.members.filter((member) => member.id !== memberId),
    }));
  }, [currentUser?.role, commitSnapshot]);

  const setMemberStatus = useCallback(
    async (memberId: string, status: AccountStatus) => {
      if (currentUser?.role !== 'ADMIN' || memberId === 'nazco_adrian') return;
      await firebaseSyncService.setMemberAccess(memberId, status);
      commitSnapshot((prev) => ({
        ...prev,
        members: prev.members.map((member) =>
          member.id === memberId ? { ...member, status, presence: 'OFFLINE' } : member
        ),
      }));
    },
    [currentUser?.role, commitSnapshot]
  );

  const updateFeatureFlags = useCallback(
    (patch: Partial<FeatureFlags>) => {
      commitSnapshot((prev) => {
        const next = {
          ...prev,
          featureFlags: { ...prev.featureFlags, ...patch },
        };
        void firebaseSyncService.saveMetaConfig(next).catch(() => {});
        return next;
      });
      notify('Configuración del espacio familiar actualizada en todos los teléfonos.', 'success');
    },
    [commitSnapshot, notify]
  );

  const exportBackupJson = useCallback(() => {
    const json = familyRepository.exportJsonBackup(snapshot);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuaderno-social-familia-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Respaldo JSON descargado.', 'success');
  }, [snapshot, notify]);

  const importBackupJson = useCallback(
    (rawJson: string) => {
      try {
        const parsed = JSON.parse(rawJson) as FamilyAppSnapshot;
        if (!parsed.members || !parsed.posts) {
          throw new Error('Formato de respaldo inválido.');
        }
        commitSnapshot(() => parsed);
        void firebaseSyncService.saveMetaConfig(parsed).catch(() => {});
        parsed.members.forEach((m) => void firebaseSyncService.saveMember(m).catch(() => {}));
        parsed.posts.forEach((p) => void firebaseSyncService.savePost(p).catch(() => {}));
        parsed.chats.forEach((c) => void firebaseSyncService.saveChat(c).catch(() => {}));
        notify('Respaldo familiar restaurado y sincronizado en la nube.', 'success');
      } catch (err) {
        notify((err as Error).message || 'No se pudo importar el archivo JSON.', 'warning');
      }
    },
    [commitSnapshot, notify]
  );

  const resetDemoData = useCallback(() => {
    const fresh = familyRepository.resetToDemo();
    setSnapshot(fresh);
    setActiveUserId(null);
    setActiveSection('FEED');
    realtimeBus.publishStateSync();
    notify('Datos de demostración restaurados localmente.', 'info');
  }, [notify]);

  const value: FamilyAppContextValue = {
    snapshot: { ...snapshot, members: visibleMembers },
    cloudStatus,
    pushEnabled,
    pushSupport,
    enablePushNotifications,
    testPushNotification,
    cloudStories,
    cloudAlbumPhotos,
    incomingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    publishCloudStory,
    publishCloudAlbumPhoto,
    currentUser: visibleMembers.find((member) => member.id === currentUser?.id) ?? null,
    activeSection,
    setActiveSection,
    registerBackHandler,
    viewedProfileId,
    openProfile,
    activeChatId,
    openChatWithMember,
    setActiveChatId,
    activeCall,
    startCall,
    markCallRemoteConnected,
    endCall,
    storageUsage,
    unreadMessageCount,
    toasts,
    joyBursts,
    triggerJoyBurst,
    notify,
    loginFamilyMember,
    loginAsAdminPasswordOnly,
    logout,
    registerMember,
    updateMemberProfile,
    updateAdminPassword,
    createPost,
    toggleReaction,
    addComment,
    deleteComment,
    togglePinPost,
    toggleFeaturePost,
    toggleHidePost,
    updatePostText,
    deletePost,
    sendMessage,
    deleteMessage,
    markChatRead,
    notifyTyping,
    createGroupChat,
    createInvite,
    toggleInviteActive,
    setMemberStatus,
    refreshMembers,
    deleteRetiredMember,
    updateFeatureFlags,
    exportBackupJson,
    importBackupJson,
    resetDemoData,
  };

  return <FamilyAppContext.Provider value={value}>{children}</FamilyAppContext.Provider>;
};

export function useFamilyApp(): FamilyAppContextValue {
  const ctx = useContext(FamilyAppContext);
  if (!ctx) throw new Error('useFamilyApp debe usarse dentro de FamilyAppProvider');
  return ctx;
}
