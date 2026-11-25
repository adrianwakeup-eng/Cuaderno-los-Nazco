import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { JoyBurstItem } from '../components/shared/JoyBurstLayer';
import { familyRepository } from '../services/familyRepository';
import {
  firebaseSyncService,
  type CloudSyncState,
  type LiveCallSignal,
} from '../services/firebaseSyncService';
import {
  dispatchPushNotification,
  enableDevicePush,
  getNotificationPermission,
  getPushSupportState,
  sendTestPushToSelf,
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
  }) => { ok: boolean; error?: string; member?: FamilyMember };
  updateMemberProfile: (
    memberId: string,
    patch: Partial<
      Pick<
        FamilyMember,
        'name' | 'username' | 'email' | 'password' | 'relationship' | 'location' | 'bio' | 'avatarUrl' | 'coverUrl'
      >
    >
  ) => void;
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
  deletePost: (postId: string) => void;

  // Messenger
  sendMessage: (chatId: string, text: string, attachment?: MediaAttachment, stickerId?: string) => void;
  markChatRead: (chatId: string) => void;
  notifyTyping: (chatId: string, isTyping: boolean) => void;
  createGroupChat: (title: string, description: string, participantIds: string[]) => FamilyChat;

  // Admin
  createInvite: (label: string, maxUses: number) => FamilyInvite;
  toggleInviteActive: (code: string) => void;
  setMemberStatus: (memberId: string, status: AccountStatus) => void;
  updateFeatureFlags: (patch: Partial<FeatureFlags>) => void;
  exportBackupJson: () => void;
  importBackupJson: (rawJson: string) => void;
  resetDemoData: () => void;
}

const FamilyAppContext = createContext<FamilyAppContextValue | null>(null);
const AVATAR_PALETTE = ['#164D32', '#398B4B', '#BA9254', '#16466C', '#C85531', '#7C3AED'];

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
  const [dismissedCallIds, setDismissedCallIds] = useState<string[]>([]);

  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    const initial = familyRepository.loadSnapshot();
    const saved = familyRepository.loadActiveUserId();
    if (saved && initial.members.some((m) => m.id === saved && m.status === 'ACTIVE')) {
      return saved;
    }
    return null;
  });

  const [activeSection, setActiveSection] = useState<AppSection>('FEED');
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
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const connectCloud = async () => {
      await firebaseSyncService.ensureCloudSeeded(familyRepository.loadSnapshot());
      if (!active) return;

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

    void connectCloud();

    return () => {
      active = false;
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

  // Silently keep this device's Web Push subscription synced to the signed-in family member
  useEffect(() => {
    if (!currentUser) return;
    if (getNotificationPermission() === 'granted') {
      void enableDevicePush(currentUser.id, false).then((res) => {
        if (res.ok) setPushEnabled(true);
      });
    }
  }, [currentUser?.id]);

  // Deep-link auto-join when user taps an incoming call Push Notification (?joinCall=...)
  useEffect(() => {
    if (!currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const joinRoom = params.get('joinCall');
    if (!joinRoom) return;
    const modeParam = params.get('mode') === 'AUDIO' ? 'AUDIO' : 'VIDEO';
    const titleParam = params.get('title') || `Sala Familiar #${joinRoom}`;

    // Clean query params so reloading later won't re-join automatically
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, '', cleanUrl);

    setActiveCall({
      id: `call_join_${Date.now()}`,
      roomCode: joinRoom,
      title: titleParam,
      mode: modeParam,
      scope: 'FAMILY_ROOM',
      participantIds: [currentUser.id],
      startedById: currentUser.id,
      startedAt: new Date().toISOString(),
      isHost: false,
    });
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
    const ok = await sendTestPushToSelf(currentUser.id, currentUser.name);
    if (ok) {
      notify('Notificación de prueba enviada al servidor Push 🔔', 'success');
    } else {
      notify('Primero activa las notificaciones en este dispositivo.', 'warning');
    }
  }, [currentUser, notify]);

  // Live incoming call detected from Firestore (ringing within last 90s for this relative)
  const incomingCall = useMemo(() => {
    if (!currentUser || activeCall) return null;
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
  }, [liveCalls, currentUser, activeCall, dismissedCallIds]);

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
      void firebaseSyncService.saveChat(newChat).catch(() => {});
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
        return { ok: false, error: 'No encontramos ese usuario familiar. Verifica o crea tu cuenta.' };
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
      void firebaseSyncService.saveMember(updated).catch(() => {});
      triggerJoyBurst('💛', 8);
      notify(`¡Bienvenido a casa, ${target.name.split(' ')[0]}!`, 'success');
      return { ok: true };
    },
    [snapshot.members, commitSnapshot, triggerJoyBurst, notify]
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
        presence: 'ONLINE',
        lastActiveAt: new Date().toISOString(),
      };
      setActiveUserId(adminMember.id);
      setViewedProfileId(adminMember.id);
      setActiveSection('FEED');
      familyRepository.saveActiveUserId(adminMember.id);
      commitSnapshot((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === adminMember.id ? updated : m)),
      }));
      void firebaseSyncService.saveMember(updated).catch(() => {});
      triggerJoyBurst('✨', 9);
      notify('¡Bienvenido, Adrián (Administrador)!', 'success');
      return { ok: true };
    },
    [snapshot.adminPassword, snapshot.members, commitSnapshot, triggerJoyBurst, notify]
  );

  const logout = useCallback(() => {
    if (currentUser) {
      const offlineMember: FamilyMember = {
        ...currentUser,
        presence: 'OFFLINE',
        lastActiveAt: new Date().toISOString(),
      };
      void firebaseSyncService.saveMember(offlineMember).catch(() => {});
    }
    setActiveCall(null);
    setActiveUserId(null);
    setActiveSection('FEED');
    familyRepository.saveActiveUserId(null);
    notify('Sesión cerrada. ¡Vuelve pronto!', 'info');
  }, [currentUser, notify]);

  const registerMember = useCallback(
    (input: {
      name: string;
      username: string;
      email: string;
      password: string;
      relationship: string;
      location: string;
      bio: string;
      avatarUrl?: string;
      inviteCode?: string;
    }): { ok: boolean; error?: string; member?: FamilyMember } => {
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
      if (
        snapshot.members.some(
          (m) => m.username.toLowerCase() === cleanUsername || m.email.toLowerCase() === cleanEmail
        )
      ) {
        return { ok: false, error: 'Ese usuario o correo ya existe en Cuaderno los Nazco.' };
      }

      const cleanCode = input.inviteCode?.trim().toUpperCase();
      const matchedInvite = cleanCode
        ? snapshot.invites.find((inv) => inv.code === cleanCode && inv.active && inv.uses < inv.maxUses)
        : undefined;

      const member: FamilyMember = {
        id: `nazco_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        username: cleanUsername,
        name: cleanName,
        email: cleanEmail,
        password: cleanPassword,
        relationship: input.relationship.trim() || 'Familiar',
        location: input.location.trim() || 'Brasil',
        bio: input.bio.trim() || 'Feliz de estar en Cuaderno los Nazco 💛',
        role: 'MEMBER',
        status: 'ACTIVE',
        presence: 'ONLINE',
        avatarColor: AVATAR_PALETTE[snapshot.members.length % AVATAR_PALETTE.length],
        avatarUrl: input.avatarUrl,
        joinedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };

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
          members: [...prev.members, member],
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

      void firebaseSyncService.saveMember(member).catch(() => {});
      if (updatedGeneralChat) void firebaseSyncService.saveChat(updatedGeneralChat).catch(() => {});

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
    (
      memberId: string,
      patch: Partial<
        Pick<
          FamilyMember,
          'name' | 'username' | 'email' | 'password' | 'relationship' | 'location' | 'bio' | 'avatarUrl' | 'coverUrl'
        >
      >
    ) => {
      commitSnapshot((prev) => {
        const nextMembers = prev.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m));
        const updated = nextMembers.find((m) => m.id === memberId);
        if (updated) void firebaseSyncService.saveMember(updated).catch(() => {});
        return { ...prev, members: nextMembers };
      });
      notify('Perfil actualizado en todos los teléfonos ✨', 'success');
    },
    [commitSnapshot, notify]
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
      if (!currentUser) return;
      const clean = text.trim();
      if (!clean && !attachment && !stickerId) return;
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        chatId,
        senderId: currentUser.id,
        text: clean,
        attachment,
        stickerId,
        createdAt: new Date().toISOString(),
        readBy: [currentUser.id],
      };
      commitSnapshot((prev) => ({
        ...prev,
        chats: prev.chats
          .map((chat) => {
            if (chat.id !== chatId) return chat;
            const updated: FamilyChat = {
              ...chat,
              messages: [...chat.messages, msg],
              typingUserIds: chat.typingUserIds.filter((id) => id !== currentUser.id),
              updatedAt: msg.createdAt,
            };
            void firebaseSyncService.saveChat(updated).catch(() => {});
            void dispatchPushNotification({
              targetMemberIds: updated.participantIds,
              excludeMemberId: currentUser.id,
              title:
                updated.kind === 'GROUP'
                  ? `💬 ${currentUser.name.split(' ')[0]} en ${updated.title || 'Familia'}`
                  : `💬 ${currentUser.name}`,
              body:
                clean ||
                (attachment?.kind === 'AUDIO'
                  ? '🎙️ Nota de voz'
                  : attachment?.kind === 'IMAGE'
                    ? '📷 Envió una foto'
                    : '✨ Envió un sticker'),
              kind: 'MESSAGE',
            });
            return updated;
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
      }));
      if (stickerId) triggerJoyBurst('💕', 4);
    },
    [currentUser, commitSnapshot, triggerJoyBurst]
  );

  const markChatRead = useCallback(
    (chatId: string) => {
      if (!currentUser) return;
      commitSnapshot((prev) => ({
        ...prev,
        chats: prev.chats.map((chat) => {
          if (chat.id !== chatId) return chat;
          const hasUnread = chat.messages.some(
            (m) => m.senderId !== currentUser.id && !m.readBy.includes(currentUser.id)
          );
          if (!hasUnread) return chat;
          const updated: FamilyChat = {
            ...chat,
            messages: chat.messages.map((m) =>
              m.readBy.includes(currentUser.id)
                ? m
                : { ...m, readBy: [...m.readBy, currentUser.id] }
            ),
          };
          void firebaseSyncService.saveChat(updated).catch(() => {});
          return updated;
        }),
      }));
    },
    [currentUser, commitSnapshot]
  );

  const notifyTyping = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (!currentUser) return;
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

  // --- Calls with Real-Time Cross-Phone Cloud Ringing ---
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

      // Notify all invited family phones in real time via Firestore + closed-app Web Push!
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
        void dispatchPushNotification({
          targetMemberIds: params.participantIds,
          excludeMemberId: currentUser.id,
          title:
            params.mode === 'VIDEO'
              ? `📹 Videollamada de ${currentUser.name}`
              : `📞 Llamada de ${currentUser.name}`,
          body: `Toca para contestar ahora en Cuaderno los Nazco (Sala #${roomCode})`,
          kind: 'CALL',
          roomCode,
          callMode: params.mode,
        });
      }
    },
    [snapshot.featureFlags.videoCallsEnabled, currentUser, notify]
  );

  const acceptIncomingCall = useCallback(() => {
    if (!incomingCall || !currentUser) return;
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
    setDismissedCallIds((prev) => [...prev, incomingCall.id]);
    if (incomingCall.scope === 'DIRECT') {
      void firebaseSyncService.updateCallSignalStatus(incomingCall.id, 'ENDED').catch(() => {});
    }
    notify('Llamada rechazada.', 'info');
  }, [incomingCall, notify]);

  const endCall = useCallback(() => {
    if (activeCall) {
      void firebaseSyncService.updateCallSignalStatus(activeCall.id, 'ENDED').catch(() => {});
    }
    setActiveCall(null);
  }, [activeCall]);

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

  const setMemberStatus = useCallback(
    (memberId: string, status: AccountStatus) => {
      if (memberId === 'nazco_adrian' && status === 'DISABLED') {
        notify('La cuenta de Administrador no puede desactivarse.', 'warning');
        return;
      }
      commitSnapshot((prev) => {
        const nextMembers = prev.members.map((m) =>
          m.id === memberId
            ? { ...m, status, presence: status === 'DISABLED' ? 'OFFLINE' : m.presence }
            : m
        );
        const updated = nextMembers.find((m) => m.id === memberId);
        if (updated) void firebaseSyncService.saveMember(updated).catch(() => {});
        return { ...prev, members: nextMembers };
      });
      notify(status === 'ACTIVE' ? 'Cuenta reactivada.' : 'Cuenta desactivada.', 'info');
    },
    [commitSnapshot, notify]
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
    a.download = `cuaderno-los-nazco-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
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
    snapshot,
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
    currentUser,
    activeSection,
    setActiveSection,
    viewedProfileId,
    openProfile,
    activeChatId,
    openChatWithMember,
    setActiveChatId,
    activeCall,
    startCall,
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
    deletePost,
    sendMessage,
    markChatRead,
    notifyTyping,
    createGroupChat,
    createInvite,
    toggleInviteActive,
    setMemberStatus,
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
