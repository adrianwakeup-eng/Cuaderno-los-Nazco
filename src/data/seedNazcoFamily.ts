import type { FamilyAppSnapshot } from '../types';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

export function createSeedNazcoSnapshot(): FamilyAppSnapshot {
  return {
    version: 3,
    familyName: 'Cuaderno Social de la familia',
    cloudOwnerEmail: 'adrianwakeup@gmail.com',
    adminPassword: 'nazco2026',
    members: [
      {
        id: 'nazco_adrian',
        username: 'adrian',
        name: 'Adrián Nazco',
        email: 'adrianwakeup@gmail.com',
        password: 'nazco2026',
        relationship: 'Fundador · Administrador',
        location: 'Brasil',
        bio: 'Creador de Cuaderno Social de la familia. Nuestro rincón privado lleno de cariño, fotos, videos, notas de voz y videollamadas en familia.',
        role: 'ADMIN',
        status: 'ACTIVE',
        presence: 'ONLINE',
        avatarColor: '#164D32',
        joinedAt: daysAgo(1),
        lastActiveAt: minsAgo(1),
      },
    ],
    posts: [],
    chats: [
      {
        id: 'chat_familia_general',
        kind: 'GROUP',
        title: 'Sala General · Familia',
        description: 'Conversación grupal privada de toda la familia',
        participantIds: ['nazco_adrian'],
        typingUserIds: [],
        updatedAt: minsAgo(1),
        messages: [],
      },
    ],
    invites: [
      {
        code: 'NAZCO-FAM-2026',
        label: 'Invitación familiar general',
        assignedRole: 'MEMBER',
        createdBy: 'nazco_adrian',
        createdAt: daysAgo(1),
        active: true,
        uses: 0,
        maxUses: 50,
      },
    ],
    featureFlags: {
      videoCallsEnabled: true,
      voiceNotesEnabled: true,
      videoUploadsEnabled: true,
      announcementsEnabled: true,
      autoCompressImages: true,
      maxUploadMb: 25,
      storageQuotaMb: 500,
    },
  };
}
