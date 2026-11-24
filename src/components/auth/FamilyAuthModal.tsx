import React from 'react';
import type { FamilyMember } from '../../types';

export const MemberAvatar: React.FC<{
  member: Pick<FamilyMember, 'name' | 'avatarColor' | 'avatarUrl' | 'presence'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showPresence?: boolean;
}> = ({ member, size = 'md', showPresence = false }) => {
  const dims = {
    xs: 'h-7 w-7 text-xs',
    sm: 'h-9 w-9 text-sm',
    md: 'h-11 w-11 text-base',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-24 w-24 text-3xl',
  }[size];

  const dotColor =
    member.presence === 'ONLINE'
      ? 'bg-emerald-500'
      : member.presence === 'AWAY'
        ? 'bg-amber-400'
        : 'bg-stone-400';

  const initials = member.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative inline-flex shrink-0">
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.name}
          className={`${dims} rounded-full object-cover ring-2 ring-white shadow-sm`}
        />
      ) : (
        <div
          style={{ backgroundColor: member.avatarColor }}
          className={`${dims} flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white shadow-sm`}
        >
          {initials || 'N'}
        </div>
      )}
      {showPresence && (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white ${dotColor}`}
          title={
            member.presence === 'ONLINE'
              ? 'En línea'
              : member.presence === 'AWAY'
                ? 'Ausente'
                : 'Desconectado'
          }
        />
      )}
    </div>
  );
};
