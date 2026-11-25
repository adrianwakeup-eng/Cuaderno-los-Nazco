import type { FamilyAppSnapshot, FamilyMember } from '../types';
import { normalizeRegion, parseMemberLocation } from '../data/memberLocation';

const offlineKey = 'cuaderno_family_offline_reading_v1';
const tutorialKey = (memberId: string) => `cuaderno_push_tutorial_${memberId}`;

export function queuePushTutorial(memberId: string): void {
  try {
    if (!localStorage.getItem(tutorialKey(memberId))) localStorage.setItem(tutorialKey(memberId), 'pending');
  } catch {
    // Private browsing or storage restrictions can prevent persistence.
  }
}

export function hasPendingPushTutorial(memberId: string): boolean {
  try {
    return localStorage.getItem(tutorialKey(memberId)) === 'pending';
  } catch {
    return false;
  }
}

export function completePushTutorial(memberId: string): void {
  try {
    localStorage.setItem(tutorialKey(memberId), 'seen');
  } catch {
    // The notification settings remain available from the bell.
  }
}

export function isCubaMember(member: FamilyMember | null): boolean {
  return member?.role === 'MEMBER' &&
    normalizeRegion(parseMemberLocation(member.location).country) === 'cuba';
}

export function clearOfflineReading(): void {
  try { localStorage.removeItem(offlineKey); } catch { /* Storage can be unavailable. */ }
}

export function saveOfflineReading(member: FamilyMember, snapshot: FamilyAppSnapshot): void {
  if (!isCubaMember(member)) return;
  const names = new Map(snapshot.members.map(({ id, name }) => [id, name]));
  const posts = snapshot.posts
    .filter((post) => !post.hidden && post.text?.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 24)
    .map(({ authorId, text, createdAt }) => ({
      author: (names.get(authorId) ?? 'Familiar').slice(0, 100),
      text: text.slice(0, 1200),
      createdAt,
    }));
  try {
    localStorage.setItem(offlineKey, JSON.stringify({
      memberId: member.id,
      name: member.name.slice(0, 100),
      savedAt: new Date().toISOString(),
      posts,
    }));
  } catch {
    // Leave the last successful copy in place if the device is full.
  }
}
