import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AlbumPhotoItem,
  CallMode,
  CallScope,
  FamilyAppSnapshot,
  FamilyChat,
  FamilyInvite,
  FamilyMember,
  FamilyPost,
  FamilyStory,
  FeatureFlags,
} from '../types';
import { ensureFirebaseSession, firestoreDb } from './firebaseClient';

const FAMILY_ROOT = 'families/los_nazco';

export interface CloudMetaConfig {
  familyName: string;
  cloudOwnerEmail: string;
  adminPassword: string;
  invites: FamilyInvite[];
  featureFlags: FeatureFlags;
  updatedAt: string;
}

export interface LiveCallSignal {
  id: string;
  roomCode: string;
  title: string;
  mode: CallMode;
  scope: CallScope;
  chatId?: string;
  participantIds: string[];
  startedById: string;
  callerName: string;
  status: 'RINGING' | 'ACCEPTED' | 'ENDED';
  createdAt: string;
}

export type CloudSyncState = 'CONNECTING' | 'CONNECTED' | 'OFFLINE' | 'ERROR';

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const MAX_CLOUD_DATA_URL_LEN = 700_000;

/**
 * Converts a local blob: URL (from IndexedDB/File) into a compact Data URL
 * if small enough for direct Firestore cross-device sync.
 */
export async function inlineAttachmentForCloud(previewUrl?: string): Promise<string | undefined> {
  if (!previewUrl) return undefined;
  if (previewUrl.startsWith('data:')) {
    return previewUrl.length <= MAX_CLOUD_DATA_URL_LEN ? previewUrl : undefined;
  }
  if (!previewUrl.startsWith('blob:')) return previewUrl;
  try {
    const res = await fetch(previewUrl);
    const blob = await res.blob();
    if (blob.size > 520_000) return undefined;
    return await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const out = typeof reader.result === 'string' ? reader.result : undefined;
        resolve(out && out.length <= MAX_CLOUD_DATA_URL_LEN ? out : undefined);
      };
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export const firebaseSyncService = {
  /** Ensures initial seed exists in Firestore once if the cloud family space is empty */
  async ensureCloudSeeded(seed: FamilyAppSnapshot): Promise<boolean> {
    try {
      await ensureFirebaseSession();
      const metaRef = doc(firestoreDb, `${FAMILY_ROOT}/meta/config`);
      const snap = await getDoc(metaRef);
      if (snap.exists()) return true;

      const meta: CloudMetaConfig = {
        familyName: seed.familyName,
        cloudOwnerEmail: seed.cloudOwnerEmail,
        adminPassword: seed.adminPassword,
        invites: seed.invites,
        featureFlags: seed.featureFlags,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(metaRef, stripUndefined(meta));

      await Promise.all([
        ...seed.members.map((m) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/members`, m.id), stripUndefined(m))
        ),
        ...seed.posts.map((p) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/posts`, p.id), stripUndefined(p))
        ),
        ...seed.chats.map((c) =>
          setDoc(doc(firestoreDb, `${FAMILY_ROOT}/chats`, c.id), stripUndefined(c))
        ),
      ]);
      return true;
    } catch {
      return false;
    }
  },

  /** Real-time subscriptions for every family collection across all phones */
  subscribeAll(handlers: {
    onMeta: (meta: CloudMetaConfig) => void;
    onMembers: (members: FamilyMember[]) => void;
    onPosts: (posts: FamilyPost[]) => void;
    onChats: (chats: FamilyChat[]) => void;
    onStories: (stories: FamilyStory[]) => void;
    onAlbums: (photos: AlbumPhotoItem[]) => void;
    onCalls: (calls: LiveCallSignal[]) => void;
    onStatus: (state: CloudSyncState) => void;
  }): () => void {
    const unsubs: Unsubscribe[] = [];
    let cancelled = false;

    handlers.onStatus('CONNECTING');

    void ensureFirebaseSession().then(() => {
      if (cancelled) return;

      const onErr = () => {
        handlers.onStatus(navigator.onLine ? 'ERROR' : 'OFFLINE');
      };

      unsubs.push(
        onSnapshot(
          doc(firestoreDb, `${FAMILY_ROOT}/meta/config`),
          (snap) => {
            if (snap.exists()) {
              handlers.onStatus('CONNECTED');
              handlers.onMeta(snap.data() as CloudMetaConfig);
            }
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/members`),
          (qs) => {
            handlers.onStatus('CONNECTED');
            const list = qs.docs.map((d) => d.data() as FamilyMember);
            if (list.length > 0) handlers.onMembers(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/posts`),
          (qs) => {
            handlers.onStatus('CONNECTED');
            const list = qs.docs
              .map((d) => d.data() as FamilyPost)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onPosts(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/chats`),
          (qs) => {
            handlers.onStatus('CONNECTED');
            const list = qs.docs
              .map((d) => d.data() as FamilyChat)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            handlers.onChats(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/stories`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as FamilyStory)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onStories(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/albums`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as AlbumPhotoItem)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onAlbums(list);
          },
          onErr
        )
      );

      unsubs.push(
        onSnapshot(
          collection(firestoreDb, `${FAMILY_ROOT}/calls`),
          (qs) => {
            const list = qs.docs
              .map((d) => d.data() as LiveCallSignal)
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            handlers.onCalls(list);
          },
          onErr
        )
      );
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          // ignore
        }
      });
    };
  },

  async saveMetaConfig(snapshot: FamilyAppSnapshot): Promise<void> {
    await ensureFirebaseSession();
    const meta: CloudMetaConfig = {
      familyName: snapshot.familyName,
      cloudOwnerEmail: snapshot.cloudOwnerEmail,
      adminPassword: snapshot.adminPassword,
      invites: snapshot.invites,
      featureFlags: snapshot.featureFlags,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/meta/config`), stripUndefined(meta));
  },

  async saveMember(member: FamilyMember): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/members`, member.id), stripUndefined(member));
  },

  async savePost(post: FamilyPost): Promise<void> {
    await ensureFirebaseSession();
    const preparedAttachments = await Promise.all(
      post.attachments.map(async (att) => ({
        ...att,
        previewUrl: await inlineAttachmentForCloud(att.previewUrl),
      }))
    );
    await setDoc(
      doc(firestoreDb, `${FAMILY_ROOT}/posts`, post.id),
      stripUndefined({ ...post, attachments: preparedAttachments })
    );
  },

  async deletePost(postId: string): Promise<void> {
    await ensureFirebaseSession();
    await deleteDoc(doc(firestoreDb, `${FAMILY_ROOT}/posts`, postId));
  },

  async saveChat(chat: FamilyChat): Promise<void> {
    await ensureFirebaseSession();
    const preparedMessages = await Promise.all(
      chat.messages.map(async (m) => ({
        ...m,
        attachment: m.attachment
          ? {
              ...m.attachment,
              previewUrl: await inlineAttachmentForCloud(m.attachment.previewUrl),
            }
          : undefined,
      }))
    );
    await setDoc(
      doc(firestoreDb, `${FAMILY_ROOT}/chats`, chat.id),
      stripUndefined({ ...chat, messages: preparedMessages })
    );
  },

  async saveStory(story: FamilyStory): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/stories`, story.id), stripUndefined(story));
  },

  async saveAlbumPhoto(photo: AlbumPhotoItem): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/albums`, photo.id), stripUndefined(photo));
  },

  async publishCallSignal(signal: LiveCallSignal): Promise<void> {
    await ensureFirebaseSession();
    await setDoc(doc(firestoreDb, `${FAMILY_ROOT}/calls`, signal.id), stripUndefined(signal));
  },

  async updateCallSignalStatus(
    callId: string,
    status: LiveCallSignal['status']
  ): Promise<void> {
    await ensureFirebaseSession();
    await updateDoc(doc(firestoreDb, `${FAMILY_ROOT}/calls`, callId), { status });
  },
};
