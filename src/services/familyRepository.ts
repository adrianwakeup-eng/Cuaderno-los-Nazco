import { createSeedNazcoSnapshot } from '../data/seedNazcoFamily';
import { getMediaBlobUrl } from './storageService';
import type { FamilyAppSnapshot, MediaAttachment } from '../types';

const STORAGE_KEY = 'cuaderno_los_nazco_snapshot_v2';
const SESSION_KEY = 'cuaderno_los_nazco_active_user_v2';

export const familyRepository = {
  loadSnapshot(): FamilyAppSnapshot {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seed = createSeedNazcoSnapshot();
        this.saveSnapshot(seed);
        return seed;
      }
      const parsed = JSON.parse(raw) as FamilyAppSnapshot;
      if (!parsed || !Array.isArray(parsed.members) || parsed.members.length === 0) {
        const seed = createSeedNazcoSnapshot();
        this.saveSnapshot(seed);
        return seed;
      }
      // Enforce sole Admin rule & ensure adminPassword exists
      if (!parsed.adminPassword) {
        parsed.adminPassword = 'nazco2026';
      }
      parsed.members = parsed.members.map((m) => ({
        ...m,
        username: m.username || m.name.toLowerCase().split(' ')[0],
        password: m.password || 'familia123',
        role: m.id === 'nazco_adrian' ? 'ADMIN' : 'MEMBER',
      }));
      return parsed;
    } catch {
      return createSeedNazcoSnapshot();
    }
  },

  saveSnapshot(snapshot: FamilyAppSnapshot): void {
    try {
      const serializable: FamilyAppSnapshot = {
        ...snapshot,
        posts: snapshot.posts.map((p) => ({
          ...p,
          attachments: p.attachments.map(stripVolatileBlobUrl),
        })),
        chats: snapshot.chats.map((c) => ({
          ...c,
          typingUserIds: [],
          messages: c.messages.map((m) => ({
            ...m,
            attachment: m.attachment ? stripVolatileBlobUrl(m.attachment) : undefined,
          })),
        })),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch {
      // Ignore quota errors
    }
  },

  /** Returns null when not signed in so the Welcome Login Gate opens first. */
  loadActiveUserId(): string | null {
    const val = localStorage.getItem(SESSION_KEY);
    return val && val.trim().length > 0 ? val : null;
  },

  saveActiveUserId(userId: string | null): void {
    if (!userId) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, userId);
  },

  async hydrateMediaUrls(snapshot: FamilyAppSnapshot): Promise<FamilyAppSnapshot> {
    const hydrateAttachment = async (att: MediaAttachment): Promise<MediaAttachment> => {
      if (!att.storageKey) return att;
      if (att.previewUrl && !att.previewUrl.startsWith('blob:')) return att;
      const url = await getMediaBlobUrl(att.storageKey);
      return url ? { ...att, previewUrl: url } : att;
    };

    const posts = await Promise.all(
      snapshot.posts.map(async (p) => ({
        ...p,
        attachments: await Promise.all(p.attachments.map(hydrateAttachment)),
      }))
    );

    const chats = await Promise.all(
      snapshot.chats.map(async (c) => ({
        ...c,
        messages: await Promise.all(
          c.messages.map(async (m) => ({
            ...m,
            attachment: m.attachment ? await hydrateAttachment(m.attachment) : undefined,
          }))
        ),
      }))
    );

    return { ...snapshot, posts, chats };
  },

  resetToDemo(): FamilyAppSnapshot {
    const seed = createSeedNazcoSnapshot();
    this.saveSnapshot(seed);
    this.saveActiveUserId(null);
    return seed;
  },

  exportJsonBackup(snapshot: FamilyAppSnapshot): string {
    return JSON.stringify(
      {
        ...snapshot,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },
};

function stripVolatileBlobUrl(att: MediaAttachment): MediaAttachment {
  if (att.storageKey && att.previewUrl?.startsWith('blob:')) {
    const { previewUrl: _ignored, ...rest } = att;
    return rest;
  }
  return att;
}
