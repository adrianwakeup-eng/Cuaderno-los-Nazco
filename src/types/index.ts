export type UserRole = 'ADMIN' | 'MEMBER';
export type AccountStatus = 'ACTIVE' | 'DISABLED';
export type PresenceStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface FamilyMember {
  id: string;
  username: string;
  name: string;
  email: string;
  password: string;
  relationship: string;
  location: string;
  bio: string;
  role: UserRole;
  status: AccountStatus;
  presence: PresenceStatus;
  avatarColor: string;
  avatarUrl?: string;
  coverUrl?: string;
  joinedAt: string;
  lastActiveAt: string;
}

export type PostFilter = 'ALL' | 'PHOTO' | 'VIDEO' | 'VOICE' | 'ANNOUNCEMENT';
export type MediaKind = 'IMAGE' | 'VIDEO' | 'AUDIO';

export interface MediaAttachment {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec?: number;
  storageKey?: string;
  cloudMediaId?: string;
  posterUrl?: string;
  previewUrl?: string;
}

export type ReactionKey = '❤️' | '🥰' | '🥹' | '👏' | '😂' | '🎉' | '🙏';

export interface PostComment {
  id: string;
  postId: string;
  parentId?: string | null;
  authorId: string;
  text: string;
  stickerId?: string;
  createdAt: string;
  hidden?: boolean;
}

export interface FamilyPost {
  id: string;
  authorId: string;
  text: string;
  category: 'PHOTO' | 'VIDEO' | 'VOICE' | 'ANNOUNCEMENT' | 'UPDATE';
  attachments: MediaAttachment[];
  stickerId?: string;
  reactions: Record<ReactionKey, string[]>;
  comments: PostComment[];
  pinned: boolean;
  featured: boolean;
  hidden: boolean;
  createdAt: string;
}

export type ChatKind = 'DIRECT' | 'GROUP';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  attachment?: MediaAttachment;
  stickerId?: string;
  createdAt: string;
  deliveredTo?: string[];
  readBy: string[];
}

export interface FamilyChat {
  id: string;
  kind: ChatKind;
  title?: string;
  description?: string;
  participantIds: string[];
  messages: ChatMessage[];
  typingUserIds: string[];
  updatedAt: string;
}

export type CallMode = 'AUDIO' | 'VIDEO';
export type CallScope = 'DIRECT' | 'FAMILY_ROOM';
export type CallConnectionState =
  | 'IDLE'
  | 'REQUESTING_PERMISSIONS'
  | 'RINGING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ENDED'
  | 'ERROR';

export interface ActiveCallSession {
  id: string;
  roomCode: string;
  title: string;
  mode: CallMode;
  scope: CallScope;
  chatId?: string;
  participantIds: string[];
  startedById: string;
  startedAt: string;
  isHost: boolean;
}

export interface FamilyInvite {
  code: string;
  label: string;
  assignedRole: UserRole;
  createdBy: string;
  createdAt: string;
  active: boolean;
  uses: number;
  maxUses: number;
}

export interface FeatureFlags {
  videoCallsEnabled: boolean;
  voiceNotesEnabled: boolean;
  videoUploadsEnabled: boolean;
  announcementsEnabled: boolean;
  autoCompressImages: boolean;
  maxUploadMb: number;
  storageQuotaMb: number;
}

export interface StorageUsageSummary {
  totalBytes: number;
  imageBytes: number;
  videoBytes: number;
  audioBytes: number;
  fileCount: number;
  quotaBytes: number;
}

export type AppSection = 'FEED' | 'MESSAGES' | 'CALLS' | 'ALBUMS' | 'FAMILY' | 'PROFILE' | 'ADMIN';

export type AppearanceMode = 'IMMERSIVE_3D' | 'ARTISANAL' | 'LIGHT';
export type TextScaleOption = 'normal' | 'large' | 'xlarge';

export interface AppearancePreferences {
  mode: AppearanceMode;
  animationsEnabled: boolean;
  effects3dEnabled: boolean;
  soundsEnabled: boolean;
  hapticsEnabled: boolean;
  textScale: TextScaleOption;
}

export type AlbumCategoryId =
  | 'FAMILIA'
  | 'VIAJES'
  | 'CUMPLEANOS'
  | 'REUNIONES'
  | 'RECUERDOS'
  | 'CELEBRACIONES';

export interface FamilyStory {
  id: string;
  authorId: string;
  caption: string;
  imageUrl?: string;
  bgGradient?: string;
  createdAt: string;
  viewedBy: string[];
  reactions: string[];
}

export interface CallHistoryEntry {
  id: string;
  title: string;
  mode: CallMode;
  scope: CallScope;
  participantIds: string[];
  startedAt: string;
  durationSec: number;
}

export interface AlbumPhotoItem {
  id: string;
  album: AlbumCategoryId;
  authorId: string;
  title: string;
  imageUrl: string;
  createdAt: string;
  likes: string[];
  comments: { id: string; authorId: string; text: string; createdAt: string }[];
}

export interface FamilyAppSnapshot {
  version: number;
  familyName: string;
  cloudOwnerEmail: string;
  /** Password-only master key for the sole family Administrator (Adrián) */
  adminPassword: string;
  members: FamilyMember[];
  posts: FamilyPost[];
  chats: FamilyChat[];
  invites: FamilyInvite[];
  featureFlags: FeatureFlags;
}
