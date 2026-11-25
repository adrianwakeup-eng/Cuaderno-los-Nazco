import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  HardDrive,
  KeyRound,
  Pin,
  RotateCcw,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { formatBytes } from '../../services/storageService';
import { MemberAvatar } from '../auth/FamilyAuthModal';

type AdminTab = 'MEMBERS' | 'MODERATION' | 'STORAGE';

export const AdminPanelView: React.FC = () => {
  const {
    snapshot,
    currentUser,
    storageUsage,
    createInvite,
    toggleInviteActive,
    setMemberStatus,
    refreshMembers,
    deleteRetiredMember,
    openProfile,
    togglePinPost,
    toggleFeaturePost,
    toggleHidePost,
    deletePost,
    deleteComment,
    updateFeatureFlags,
    updateAdminPassword,
    exportBackupJson,
    importBackupJson,
    resetDemoData,
    notify,
  } = useFamilyApp();

  const [memberQuery, setMemberQuery] = useState('');
  const [showRemoved, setShowRemoved] = useState(false);
  const [refreshingMembers, setRefreshingMembers] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>('MEMBERS');
  const [inviteLabel, setInviteLabel] = useState('');
  const [inviteMaxUses, setInviteMaxUses] = useState(5);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [curAdminPass, setCurAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div className="card-warm mx-auto max-w-xl rounded-3xl p-8 text-center">
        <Shield className="mx-auto h-10 w-10 text-terracotta-600" />
        <h2 className="mt-3 font-editorial text-2xl font-bold text-espresso-900">
          Acceso exclusivo del Administrador
        </h2>
        <p className="mt-2 text-sm text-espresso-500">
          Solo el dueño de Cuaderno Social de la Familia puede ingresar al Panel de Administración con su
          contraseña maestra.
        </p>
      </div>
    );
  }

  const flags = snapshot.featureFlags;
  const membersById = new Map(snapshot.members.map((m) => [m.id, m]));
  const memberList = snapshot.members.filter((member) =>
    member.role !== 'ADMIN' && member.status === (showRemoved ? 'DISABLED' : 'ACTIVE') &&
    [member.name, member.username, member.email].some((field) =>
      field.toLocaleLowerCase().includes(memberQuery.trim().toLocaleLowerCase())
    )
  );

  const reloadMembers = async () => {
    setRefreshingMembers(true);
    try {
      await refreshMembers();
      notify('Lista actualizada desde la nube.', 'success');
    } catch {
      notify('No se pudo conectar con la nube para actualizar las cuentas.', 'warning');
    } finally {
      setRefreshingMembers(false);
    }
  };

  const changeMemberAccess = async (member: (typeof snapshot.members)[number]) => {
    const removing = member.status === 'ACTIVE';
    if (removing && !window.confirm(`¿Quitar el acceso a ${member.name}? Podrás restaurarlo desde Retirados.`)) return;
    setSavingMemberId(member.id);
    try {
      await setMemberStatus(member.id, removing ? 'DISABLED' : 'ACTIVE');
      notify(removing ? 'Acceso eliminado.' : 'Acceso restaurado.', 'success');
    } catch {
      notify('La nube no confirmó el cambio. Actualiza la lista e inténtalo de nuevo.', 'warning');
    } finally {
      setSavingMemberId(null);
    }
  };

  const removeAccount = async (member: (typeof snapshot.members)[number]) => {
    if (!window.confirm(`¿Eliminar definitivamente el perfil de ${member.name}? No se podrá restaurar. Sus publicaciones y mensajes se conservarán. Confirma con tu cuenta de Google de administrador.`)) return;
    setSavingMemberId(member.id);
    try {
      await deleteRetiredMember(member.id);
      notify('Perfil eliminado definitivamente.', 'success');
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = (error as Error).message;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/operation-not-allowed' || code === 'auth/unauthorized-domain') {
        notify('Firebase debe habilitar el inicio de sesión con Google y autorizar este dominio.', 'warning');
      } else if (code === 'permission-denied') {
        notify('Firebase requiere la cuenta de Google verificada del administrador.', 'warning');
      } else if (message === 'member-not-retired') {
        notify('Solo se pueden eliminar perfiles retirados. Actualiza la lista.', 'warning');
      } else {
        notify('No se confirmó la eliminación. Actualiza la lista antes de reintentar.', 'warning');
      }
    } finally {
      setSavingMemberId(null);
    }
  };

  const quotaPct = Math.min(
    100,
    Math.round((storageUsage.totalBytes / Math.max(1, storageUsage.quotaBytes)) * 100)
  );

  const copyCode = (code: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    notify(`Código ${code} copiado.`, 'success');
    window.setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header & Summary KPIs */}
      <div className="card-warm overflow-hidden rounded-3xl">
        <div className="celestial-silk relative border-b border-amber-200/70 px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-bold text-terracotta-700 backdrop-blur-sm">
                <Shield className="h-3.5 w-3.5" /> Panel Centralizado de Administración
              </span>
              <h2 className="mt-2 font-editorial text-3xl font-bold text-espresso-900">
                Control de Cuaderno Social de la Familia
              </h2>
              <p className="mt-0.5 text-sm text-espresso-800">
                Administra cuentas familiares, modera publicaciones y comentarios, controla el
                almacenamiento y activa o desactiva módulos en tiempo real.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportBackupJson}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-espresso-800 backdrop-blur-sm hover:bg-white"
              >
                <Download className="h-4 w-4 text-terracotta-600" />
                Exportar respaldo
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void file.text().then(importBackupJson);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-espresso-800 backdrop-blur-sm hover:bg-white"
              >
                <Upload className="h-4 w-4 text-olive-600" />
                Importar respaldo
              </button>
              <button
                onClick={() => {
                  if (window.confirm('¿Restaurar los datos de demostración iniciales de la familia?')) {
                    resetDemoData();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-espresso-600 backdrop-blur-sm hover:bg-red-50 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar demo
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
        {/* Ghost Mode Status Banner */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/75 bg-forest-900/95 px-4 py-3 text-xs text-solar-100 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">👻</span>
            <div>
              <p className="font-extrabold text-solar-200">Cuenta de Administrador Fantasma activa</p>
              <p className="text-[11px] text-solar-100/85">
                Eres 100% invisible para la familia (sin estado en línea, sin recibos de lectura ni presencia en el mapa, chats o llamadas). Puedes revisar, editar, eliminar y gestionar toda la web en silencio.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-amber-200/60 bg-white/75 p-4">
            <p className="text-xs font-semibold text-espresso-500">Miembros activos</p>
            <p className="mt-1 text-2xl font-bold text-espresso-900">
              {snapshot.members.filter((m) => m.status === 'ACTIVE' && m.role !== 'ADMIN').length} /{' '}
              {snapshot.members.filter((m) => m.role !== 'ADMIN').length}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-white/75 p-4">
            <p className="text-xs font-semibold text-espresso-500">Publicaciones</p>
            <p className="mt-1 text-2xl font-bold text-espresso-900">{snapshot.posts.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-white/75 p-4">
            <p className="text-xs font-semibold text-espresso-500">Archivos multimedia</p>
            <p className="mt-1 text-2xl font-bold text-espresso-900">{storageUsage.fileCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-white/75 p-4">
            <p className="text-xs font-semibold text-espresso-500">Almacenamiento usado</p>
            <p className="mt-1 text-2xl font-bold text-terracotta-600">
              {formatBytes(storageUsage.totalBytes)}
            </p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-amber-200/60 pt-4">
          {(
            [
              ['MEMBERS', 'Miembros e invitaciones', Users],
              ['MODERATION', 'Moderación de posts', FileText],
              ['STORAGE', 'Almacenamiento y módulos', Sliders],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === id
                  ? 'bg-warm-love-gradient text-white shadow-sm'
                  : 'border border-amber-200/70 bg-white/80 text-espresso-700 hover:bg-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* TAB 1: MEMBERS & INVITES */}
      {tab === 'MEMBERS' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Invite Generator */}
          <div className="card-warm space-y-4 rounded-3xl p-5 lg:col-span-5">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-terracotta-600" />
              <h3 className="font-editorial text-lg font-bold text-espresso-900">
                Invitar familiares
              </h3>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createInvite(inviteLabel || 'Invitación familiar', inviteMaxUses);
                setInviteLabel('');
              }}
              className="space-y-3 rounded-2xl bg-linen-50 p-4"
            >
              <input
                value={inviteLabel}
                onChange={(e) => setInviteLabel(e.target.value)}
                placeholder="Etiqueta (ej. Tíos de Colombia)"
                className="w-full rounded-xl border border-linen-300 bg-white px-3.5 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="flex-1 rounded-xl border border-linen-200 bg-white px-3 py-2 text-xs font-semibold text-espresso-600">
                  Rol asignado: Miembro familiar
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={inviteMaxUses}
                  onChange={(e) => setInviteMaxUses(Number(e.target.value) || 1)}
                  className="w-24 rounded-xl border border-linen-300 bg-white px-3 py-2 text-sm"
                  placeholder="Usos"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-terracotta-600 py-2.5 text-sm font-semibold text-white hover:bg-terracotta-700"
              >
                Generar código de invitación
              </button>
            </form>

            {/* Exclusive Admin Master Password Change */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = updateAdminPassword(curAdminPass, newAdminPass);
                if (res.ok) {
                  setCurAdminPass('');
                  setNewAdminPass('');
                  setPassMsg('Contraseña de Administrador actualizada.');
                } else {
                  setPassMsg(res.error ?? 'Error al actualizar');
                }
              }}
              className="space-y-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-terracotta-700">
                🔐 Cambiar contraseña maestra de Administrador
              </p>
              <input
                type="password"
                required
                value={curAdminPass}
                onChange={(e) => {
                  setCurAdminPass(e.target.value);
                  setPassMsg(null);
                }}
                placeholder="Contraseña actual"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs focus:border-terracotta-500 focus:outline-none"
              />
              <input
                type="password"
                required
                value={newAdminPass}
                onChange={(e) => {
                  setNewAdminPass(e.target.value);
                  setPassMsg(null);
                }}
                placeholder="Nueva contraseña (mín. 4 caracteres)"
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs focus:border-terracotta-500 focus:outline-none"
              />
              {passMsg && <p className="text-xs font-semibold text-terracotta-700">{passMsg}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-espresso-900 py-2 text-xs font-bold text-white hover:bg-terracotta-700"
              >
                Guardar nueva contraseña Admin
              </button>
            </form>

            <div className="space-y-2">
              {snapshot.invites.map((inv) => (
                <div
                  key={inv.code}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-linen-200 p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-espresso-900">
                        {inv.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          inv.active
                            ? 'bg-olive-100 text-olive-700'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {inv.active ? 'Activo' : 'Revocado'}
                      </span>
                    </div>
                    <p className="text-xs text-espresso-500">
                      {inv.label} · {inv.assignedRole === 'ADMIN' ? 'Admin' : 'Miembro'} ·{' '}
                      {inv.uses}/{inv.maxUses} usos
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => copyCode(inv.code)}
                      className="rounded-lg p-2 text-espresso-600 hover:bg-linen-100"
                      title="Copiar código"
                    >
                      {copiedCode === inv.code ? (
                        <Check className="h-4 w-4 text-olive-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleInviteActive(inv.code)}
                      className="rounded-lg border border-linen-300 px-2.5 py-1 text-xs font-semibold text-espresso-700 hover:bg-linen-100"
                    >
                      {inv.active ? 'Revocar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Family Members Role & Account Control */}
          <div className="card-warm rounded-3xl p-5 lg:col-span-7">
            <h3 className="font-editorial text-lg font-bold text-espresso-900">
              Cuentas de la familia
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-linen-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-espresso-500" />
                <input
                  value={memberQuery}
                  onChange={(event) => setMemberQuery(event.target.value)}
                  placeholder="Buscar familiar"
                  aria-label="Buscar familiar por nombre, usuario o correo"
                  className="min-w-0 flex-1 bg-transparent text-sm"
                />
              </label>
              <button
                type="button"
                onClick={() => void reloadMembers()}
                disabled={refreshingMembers || savingMemberId !== null}
                className="flex items-center gap-1 rounded-xl bg-olive-100 px-3 py-2 text-xs font-bold text-olive-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingMembers ? 'animate-spin' : ''}`} />
                {refreshingMembers ? 'Actualizando…' : 'Actualizar lista'}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {[false, true].map((removed) => (
                <button
                  key={String(removed)}
                  type="button"
                  onClick={() => setShowRemoved(removed)}
                  aria-pressed={showRemoved === removed}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${showRemoved === removed ? 'bg-forest-700 text-white' : 'bg-white text-espresso-700'}`}
                >
                  {removed ? 'Retirados' : 'Activos'}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2.5">
              {memberList.length === 0 && (
                <p className="text-sm text-espresso-500">
                  {memberQuery.trim() ? 'No hay coincidencias.' : showRemoved ? 'No hay familiares retirados.' : 'No hay familiares activos.'}
                </p>
              )}
              {memberList.map((member) => (
                <div
                  key={member.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 ${
                    member.status === 'DISABLED'
                      ? 'border-stone-200 bg-stone-50 opacity-70'
                      : 'border-linen-200 bg-linen-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar member={member} size="md" showPresence />
                    <div>
                      <p className="font-bold text-espresso-900">{member.name}</p>
                      <p className="text-xs text-espresso-500">
                        {member.relationship} · {member.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        member.role === 'ADMIN'
                          ? 'bg-terracotta-100 text-terracotta-700'
                          : 'bg-white text-espresso-700 ring-1 ring-linen-300'
                      }`}
                    >
                      {member.role === 'ADMIN' ? '👑 Administrador único' : `Miembro (@${member.username})`}
                    </span>
                    <button
                      type="button"
                      onClick={() => openProfile(member.id)}
                      className="rounded-xl bg-olive-100 px-3 py-1.5 text-xs font-semibold text-olive-700"
                    >
                      Editar perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => void changeMemberAccess(member)}
                      disabled={savingMemberId !== null || refreshingMembers}
                      className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${showRemoved ? 'bg-olive-100 text-olive-700' : 'bg-red-100 text-red-800'}`}
                      aria-label={`${showRemoved ? 'Restaurar' : 'Eliminar'} acceso de ${member.name}`}
                    >
                      {showRemoved ? <RotateCcw className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {savingMemberId === member.id ? 'Guardando…' : showRemoved ? 'Restaurar acceso' : 'Eliminar acceso'}
                    </button>
                    {showRemoved && (
                      <button
                        type="button"
                        onClick={() => void removeAccount(member)}
                        disabled={savingMemberId !== null || refreshingMembers}
                        className="flex items-center gap-1 rounded-xl bg-red-100 px-3 py-1.5 text-xs font-bold text-red-800 disabled:opacity-50"
                        aria-label={`Eliminar definitivamente a ${member.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar definitivamente
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POST & COMMENT MODERATION */}
      {tab === 'MODERATION' && (
        <div className="card-warm space-y-3 rounded-3xl p-5">
          <h3 className="font-editorial text-lg font-bold text-espresso-900">
            Moderación de publicaciones y comentarios ({snapshot.posts.length})
          </h3>
          {snapshot.posts.map((post) => {
            const author = membersById.get(post.authorId);
            return (
              <div
                key={post.id}
                className="rounded-2xl border border-linen-200 bg-linen-50/50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-espresso-900">
                        {author?.name ?? 'Familiar'}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-espresso-600 ring-1 ring-linen-300">
                        {post.category}
                      </span>
                      {post.pinned && (
                        <span className="rounded-full bg-terracotta-100 px-2 py-0.5 font-bold text-terracotta-700">
                          Fijada
                        </span>
                      )}
                      {post.hidden && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 font-bold text-stone-700">
                          Oculta
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-espresso-800">{post.text}</p>
                    <p className="mt-1 text-xs text-espresso-500">
                      {post.attachments.length} archivos · {post.comments.length} comentarios
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => togglePinPost(post.id)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                        post.pinned
                          ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-700'
                          : 'border-linen-300 bg-white text-espresso-700'
                      }`}
                    >
                      <Pin className="h-3.5 w-3.5" />
                      {post.pinned ? 'Desfijar' : 'Fijar'}
                    </button>
                    <button
                      onClick={() => toggleFeaturePost(post.id)}
                      className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                        post.featured
                          ? 'border-olive-600 bg-olive-50 text-olive-700'
                          : 'border-linen-300 bg-white text-espresso-700'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {post.featured ? 'Destacada' : 'Destacar'}
                    </button>
                    <button
                      onClick={() => toggleHidePost(post.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-linen-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso-700"
                    >
                      {post.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {post.hidden ? 'Mostrar' : 'Ocultar'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('¿Eliminar definitivamente esta publicación?')) {
                          deletePost(post.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>

                {post.comments.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-linen-200 pt-2.5">
                    {post.comments.map((cmt) => (
                      <div
                        key={cmt.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs"
                      >
                        <p className="text-espresso-800">
                          <strong>{membersById.get(cmt.authorId)?.name ?? 'Familiar'}:</strong>{' '}
                          {cmt.text}
                        </p>
                        <button
                          onClick={() => deleteComment(post.id, cmt.id)}
                          className="shrink-0 font-semibold text-red-600 hover:underline"
                        >
                          Borrar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: STORAGE & FEATURE FLAGS */}
      {tab === 'STORAGE' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Storage Usage & Upload Limits */}
          <div className="card-warm space-y-4 rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-terracotta-600" />
              <h3 className="font-editorial text-lg font-bold text-espresso-900">
                Almacenamiento y límites de subida
              </h3>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Consumo actual</span>
                <span>
                  {formatBytes(storageUsage.totalBytes)} / {flags.storageQuotaMb} MB ({quotaPct}%)
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-linen-200">
                <div
                  className="h-full rounded-full bg-terracotta-600 transition-all"
                  style={{ width: `${Math.max(3, quotaPct)}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-linen-50 p-2.5">
                  <p className="font-bold text-espresso-900">{formatBytes(storageUsage.imageBytes)}</p>
                  <p className="text-espresso-500">Fotos</p>
                </div>
                <div className="rounded-xl bg-linen-50 p-2.5">
                  <p className="font-bold text-espresso-900">{formatBytes(storageUsage.videoBytes)}</p>
                  <p className="text-espresso-500">Videos</p>
                </div>
                <div className="rounded-xl bg-linen-50 p-2.5">
                  <p className="font-bold text-espresso-900">{formatBytes(storageUsage.audioBytes)}</p>
                  <p className="text-espresso-500">Notas de voz</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-linen-200 pt-4">
              <div>
                <div className="flex justify-between text-sm font-semibold text-espresso-800">
                  <span>Tamaño máximo por archivo</span>
                  <span className="text-terracotta-600">{flags.maxUploadMb} MB</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={flags.maxUploadMb}
                  onChange={(e) => updateFeatureFlags({ maxUploadMb: Number(e.target.value) })}
                  className="mt-1 w-full accent-terracotta-600"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-linen-200 bg-linen-50 p-3.5">
                <div>
                  <p className="text-sm font-bold text-espresso-900">
                    Compresión automática de fotos (recomendado)
                  </p>
                  <p className="text-xs text-espresso-500">
                    Reduce fotos pesadas del celular a máx. 1440px JPEG antes de guardarlas.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={flags.autoCompressImages}
                  onChange={(e) => updateFeatureFlags({ autoCompressImages: e.target.checked })}
                  className="h-5 w-5 accent-terracotta-600"
                />
              </label>
            </div>
          </div>

          {/* Feature Flags */}
          <div className="card-warm space-y-3 rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-olive-600" />
              <h3 className="font-editorial text-lg font-bold text-espresso-900">
                Feature Flags (Módulos activos)
              </h3>
            </div>
            <p className="text-xs text-espresso-500">
              Activa o desactiva funciones para toda la familia en tiempo real sin reiniciar la app.
            </p>

            {(
              [
                [
                  'videoCallsEnabled',
                  'Videollamadas y salas familiares',
                  'Permite llamadas 1 a 1 y salas grupales WebRTC desde el chat y el hub.',
                ],
                [
                  'voiceNotesEnabled',
                  'Notas de voz y audio',
                  'Habilita grabación con micrófono y subida de audio en muro y chat.',
                ],
                [
                  'videoUploadsEnabled',
                  'Subida de videos en publicaciones',
                  'Permite adjuntar clips MP4/MOV en el muro familiar.',
                ],
                [
                  'announcementsEnabled',
                  'Anuncios familiares destacados',
                  'Permite marcar publicaciones como Anuncio familiar con insignia.',
                ],
              ] as const
            ).map(([key, title, desc]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-linen-200 bg-linen-50/70 p-3.5"
              >
                <div>
                  <p className="text-sm font-bold text-espresso-900">{title}</p>
                  <p className="text-xs text-espresso-500">{desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={flags[key]}
                  onChange={(e) => updateFeatureFlags({ [key]: e.target.checked })}
                  className="h-5 w-5 accent-olive-600"
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
