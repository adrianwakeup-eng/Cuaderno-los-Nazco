import React, { useRef, useState } from 'react';
import {
  Camera,
  Edit3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserCheck,
  Video,
} from 'lucide-react';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { compressImageFile } from '../../services/storageService';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { PostCard } from '../feed/PostCard';

export const ProfileView: React.FC = () => {
  const {
    snapshot,
    currentUser,
    viewedProfileId,
    openProfile,
    openChatWithMember,
    startCall,
    updateMemberProfile,
    logout,
  } = useFamilyApp();

  if (!currentUser) return null;

  const member =
    snapshot.members.find((m) => m.id === viewedProfileId) ?? currentUser;
  const isOwn = member.id === currentUser.id;
  const canEdit = isOwn || currentUser.role === 'ADMIN';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(member.name);
  const [relationship, setRelationship] = useState(member.relationship);
  const [location, setLocation] = useState(member.location);
  const [email, setEmail] = useState(member.email);
  const [bio, setBio] = useState(member.bio);
  const [password, setPassword] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const memberPosts = snapshot.posts
    .filter((p) => p.authorId === member.id && (!p.hidden || currentUser.role === 'ADMIN'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleImagePick = async (file: File | undefined, field: 'avatarUrl' | 'coverUrl') => {
    if (!file) return;
    const blob = await compressImageFile(file, field === 'coverUrl' ? 1200 : 480, 0.84);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateMemberProfile(member.id, { [field]: reader.result });
      }
    };
    reader.readAsDataURL(blob);
  };

  const openEditor = () => {
    setName(member.name);
    setRelationship(member.relationship);
    setLocation(member.location);
    setEmail(member.email);
    setBio(member.bio);
    setPassword('');
    setEditing(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Quick Family Profile Switcher */}
      <div className="card-warm flex items-center gap-2.5 overflow-x-auto rounded-3xl px-4 py-3">
        {snapshot.members
          .filter((m) => m.status === 'ACTIVE')
          .map((m) => {
            const active = m.id === member.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  openProfile(m.id);
                  setEditing(false);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'border-amber-300 bg-gradient-to-r from-rose-50 to-amber-50 text-terracotta-700 shadow-sm'
                    : 'border-amber-200/60 bg-white/80 text-espresso-700 hover:bg-white'
                }`}
              >
                <MemberAvatar member={m} size="xs" />
                <span>{m.name.split(' ')[0]}</span>
              </button>
            );
          })}
      </div>

      {/* Facebook-style Profile Cover & Info Card */}
      <div className="card-warm overflow-hidden rounded-3xl">
        <div
          className={`relative h-44 w-full sm:h-52 ${!member.coverUrl ? 'celestial-silk' : ''}`}
        >
          {member.coverUrl ? (
            <img
              src={member.coverUrl}
              alt={`Portada de ${member.name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, ${member.avatarColor}44, rgba(255, 245, 232, 0.28), rgba(244, 180, 160, 0.32))`,
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border border-white/45" />
          {canEdit && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void handleImagePick(e.target.files?.[0], 'coverUrl');
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-espresso-900/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-espresso-900/75"
              >
                <Camera className="h-3.5 w-3.5" />
                Cambiar portada
              </button>
            </>
          )}
        </div>

        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4">
            <div className="relative">
              <div className="angelic-halo rounded-full">
                <MemberAvatar member={member} size="xl" showPresence />
              </div>
              {canEdit && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleImagePick(e.target.files?.[0], 'avatarUrl');
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-1 right-1 rounded-full bg-terracotta-600 p-2 text-white shadow-md transition hover:bg-terracotta-700"
                    title="Cambiar foto de perfil"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {isOwn ? (
                <>
                  <button
                    onClick={openEditor}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-700"
                  >
                    <Edit3 className="h-4 w-4" />
                    Editar perfil
                  </button>
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-linen-300 bg-linen-50 px-4 py-2 text-sm font-semibold text-espresso-800 transition hover:bg-linen-100"
                  >
                    <UserCheck className="h-4 w-4" />
                    Cambiar cuenta
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => openChatWithMember(member.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-terracotta-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-terracotta-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Mensaje
                  </button>
                  <button
                    onClick={() =>
                      startCall({
                        mode: 'AUDIO',
                        scope: 'DIRECT',
                        title: member.name,
                        participantIds: [currentUser.id, member.id],
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm font-semibold text-espresso-800 hover:bg-olive-50"
                  >
                    <Phone className="h-4 w-4 text-olive-600" />
                    Audio
                  </button>
                  <button
                    onClick={() =>
                      startCall({
                        mode: 'VIDEO',
                        scope: 'DIRECT',
                        title: member.name,
                        participantIds: [currentUser.id, member.id],
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-olive-600 px-4 py-2 text-sm font-semibold text-white hover:bg-olive-700"
                  >
                    <Video className="h-4 w-4" />
                    Videollamada
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-editorial text-2xl font-bold text-espresso-900">{member.name}</h2>
              <span className="rounded-full bg-olive-50 px-3 py-0.5 text-xs font-bold text-olive-700">
                {member.relationship}
              </span>
              {member.role === 'ADMIN' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-terracotta-100 px-3 py-0.5 text-xs font-bold text-terracotta-700">
                  <ShieldCheck className="h-3.5 w-3.5" /> Administrador
                </span>
              )}
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-espresso-700">{member.bio}</p>

            <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-espresso-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-terracotta-600" />
                {member.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-terracotta-600" />
                {member.email}
              </span>
            </div>
          </div>

          {/* Inline Profile Editor */}
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMemberProfile(member.id, {
                  name: name.trim() || member.name,
                  relationship: relationship.trim() || member.relationship,
                  location: location.trim() || member.location,
                  email: email.trim() || member.email,
                  bio: bio.trim(),
                  ...(password.trim().length >= 4 ? { password: password.trim() } : {}),
                });
                setPassword('');
                setEditing(false);
              }}
              className="mt-5 space-y-3 rounded-2xl border border-linen-300 bg-linen-50 p-4"
            >
              <p className="text-sm font-bold text-espresso-900">Editar información del perfil</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre"
                  className="rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
                />
                <input
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Parentesco"
                  className="rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ciudad / País"
                  className="rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
                />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Correo"
                  className="rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
                />
              </div>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Biografía familiar"
                className="w-full rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
              />
              {member.role !== 'ADMIN' && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nueva contraseña personal (opcional, mín. 4 caracteres)"
                  className="w-full rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-linen-300 bg-white px-4 py-2 text-xs font-semibold text-espresso-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-terracotta-600 px-5 py-2 text-xs font-semibold text-white hover:bg-terracotta-700"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Member's Wall */}
      <div className="space-y-4">
        <h3 className="font-editorial text-xl font-bold text-espresso-900">
          Publicaciones de {member.name.split(' ')[0]} ({memberPosts.length})
        </h3>
        {memberPosts.length === 0 ? (
          <div className="card-warm rounded-3xl p-8 text-center text-sm text-espresso-500">
            Todavía no hay publicaciones en este perfil.
          </div>
        ) : (
          memberPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
};
