import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { compressImageFile } from '../../services/storageService';
import { MemberAvatar } from './FamilyAuthModal';

type AuthMode = 'LOGIN' | 'REGISTER' | 'ADMIN';

export const FamilyWelcomeAuthScreen: React.FC = () => {
  const { snapshot, loginFamilyMember, loginAsAdminPasswordOnly, registerMember } = useFamilyApp();

  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [error, setError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  // Member / smart login state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Exclusive Admin password-only state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPass, setShowAdminPass] = useState(false);

  // Register new family member state
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRel, setRegRel] = useState('Familiar');
  const [regLocation, setRegLocation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regInvite, setRegInvite] = useState('NAZCO-FAM-2026');
  const [regAvatarUrl, setRegAvatarUrl] = useState<string | undefined>(undefined);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const familyMembersOnly = snapshot.members.filter(
    (m) => m.role !== 'ADMIN' && m.status === 'ACTIVE'
  );

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    const compressed = await compressImageFile(file, 420, 0.85);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setRegAvatarUrl(reader.result);
    };
    reader.readAsDataURL(compressed);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Password-only sole Admin shortcut: if Correo familiar is empty, validate directly as Admin
    if (!identifier.trim()) {
      if (!password.trim()) {
        setError('Escribe tu correo familiar y contraseña (o solo tu contraseña maestra de Administrador).');
        return;
      }
      const adminRes = loginAsAdminPasswordOnly(password);
      if (!adminRes.ok) {
        setError('Escribe tu correo familiar o una contraseña de Administrador válida.');
      }
      return;
    }

    const res = loginFamilyMember(identifier, password);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo iniciar sesión.');
    }
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#241628] md:justify-end">
      {/* Full-bleed exact sunset family background photograph */}
      <img
        src="./textures/welcome-sunset-clean.jpg"
        alt="Nuestra Familia — La red social privada que nos mantiene unidos, estemos donde estemos."
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-[22%_bottom] md:object-left-bottom"
      />

      {/* Subtle readability gradient on small mobile screens only */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/35 md:hidden" />

      {/* Right-aligned Auth Card matching reference proportions & placement */}
      <div className="relative z-10 flex w-full flex-col items-center px-5 py-8 md:w-auto md:items-end md:pr-[5%] lg:pr-[6%] xl:pr-[7.5%]">
        <div className="animate-pop-in w-full max-w-[392px] rounded-[24px] bg-[#FAF9FC]/[0.97] px-7 py-9 shadow-[0_24px_64px_rgba(24,10,42,0.34)] backdrop-blur-md sm:px-9 sm:py-10">
          {/* ================= MODE 1: MAIN LOGIN (EXACT REFERENCE) ================= */}
          {mode === 'LOGIN' && (
            <div>
              <h1 className="text-center text-[27px] font-bold leading-[1.22] tracking-[-0.02em] text-[#111118] sm:text-[29px]">
                Bienvenidos a
                <br />
                Nuestra Familia <span className="inline-block">💛</span>
              </h1>

              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-center text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="mt-7 space-y-3.5">
                {/* Correo familiar */}
                <div className="relative">
                  <User
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#767387]"
                  />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      setError(null);
                    }}
                    placeholder="Correo familiar"
                    autoComplete="username"
                    className="h-[48px] w-full rounded-[14px] border border-[#D4D2DF] bg-[#F7F6FA] pl-11 pr-4 text-[14.5px] text-[#1D1B29] placeholder:text-[#767387] transition focus:border-[#763CD2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#763CD2]/15"
                  />
                </div>

                {/* Contraseña */}
                <div className="relative">
                  <Lock
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#767387]"
                  />
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    className="h-[48px] w-full rounded-[14px] border border-[#D4D2DF] bg-[#F7F6FA] pl-11 pr-11 text-[14.5px] text-[#1D1B29] placeholder:text-[#767387] transition focus:border-[#763CD2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#763CD2]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#767387] transition hover:bg-[#ECEAF4] hover:text-[#4B23A8]"
                    aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPass ? (
                      <EyeOff strokeWidth={1.75} className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye strokeWidth={1.75} className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>

                {/* Botón Entrar (gradiente violeta exacto) */}
                <button
                  type="submit"
                  className="mt-1.5 h-[48px] w-full rounded-full text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(88,36,178,0.34)] transition hover:brightness-105 active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(90deg, #8B4FD9 0%, #6A31C3 54%, #471DA6 100%)',
                  }}
                >
                  Entrar
                </button>
              </form>

              {/* ¿Olvidaste tu contraseña? */}
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotHelp((v) => !v)}
                  className="text-[13px] font-semibold text-[#5B2CB5] transition hover:text-[#3F1994] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Optional expandable help (keeps initial card 100% clean) */}
              {showForgotHelp && (
                <div className="mt-3.5 space-y-2.5 rounded-2xl border border-[#E3DCF5] bg-[#F5F1FC] p-3.5 text-xs text-[#433A5C]">
                  <p className="font-semibold text-[#3C1E7E]">
                    Acceso rápido para familiares demo (clave: <code>familia123</code>):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {familyMembersOnly.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setIdentifier(m.email);
                          setPassword('familia123');
                          setError(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#D4C7F2] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#4A22A4] transition hover:bg-[#EFE8FD]"
                      >
                        <MemberAvatar member={m} size="xs" />
                        <span>{m.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#E0D6F5] pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('ADMIN');
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1.5 font-bold text-[#5B2CB5] hover:underline"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Entrar como Administrador (solo contraseña)
                    </button>
                  </div>
                </div>
              )}

              {/* Divider "o" */}
              <div className="my-5 flex items-center gap-3.5">
                <div className="h-px flex-1 bg-[#E5E2EE]" />
                <span className="text-xs font-medium text-[#7C788C]">o</span>
                <div className="h-px flex-1 bg-[#E5E2EE]" />
              </div>

              {/* Botón Crear cuenta */}
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setError(null);
                  setShowForgotHelp(false);
                }}
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[#6C3BC8] bg-white text-[15px] font-bold text-[#5226AD] transition hover:bg-[#F5F0FF] active:scale-[0.99]"
              >
                <UserPlus strokeWidth={1.9} className="h-[18px] w-[18px]" />
                <span>Crear cuenta</span>
              </button>
            </div>
          )}

          {/* ================= MODE 2: CREAR CUENTA FAMILIAR ================= */}
          {mode === 'REGISTER' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#5B2CB5] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a iniciar sesión
              </button>

              <h2 className="text-center text-2xl font-bold text-[#111118]">
                Crear cuenta familiar 💛
              </h2>
              <p className="mt-1 text-center text-xs text-[#726E82]">
                Cada integrante de los Nazco crea su perfil con contraseña propia.
              </p>

              {error && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (regPassword !== regConfirm) {
                    setError('Las contraseñas no coinciden.');
                    return;
                  }
                  const res = registerMember({
                    name: regName,
                    username: regUsername,
                    email: regEmail,
                    password: regPassword,
                    relationship: regRel,
                    location: regLocation,
                    bio: '',
                    avatarUrl: regAvatarUrl,
                    inviteCode: regInvite,
                  });
                  if (!res.ok) setError(res.error ?? 'No se pudo crear la cuenta.');
                }}
                className="mt-4 space-y-2.5"
              >
                <div className="flex items-center gap-3 pb-1">
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handleAvatarUpload(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#763CD2] bg-[#F5F0FF] text-[#5B2CB5] transition hover:bg-[#EBE0FF]"
                  >
                    {regAvatarUrl ? (
                      <img src={regAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="text-left text-xs font-semibold text-[#5B2CB5] hover:underline"
                  >
                    {regAvatarUrl ? 'Cambiar foto de perfil' : 'Subir foto de perfil (opcional)'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Nombre completo *"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                  <input
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                    placeholder="Usuario *"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                </div>

                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="Correo familiar (ej. lucas@losnazco.fam)"
                  className="w-full rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={regRel}
                    onChange={(e) => setRegRel(e.target.value)}
                    placeholder="Parentesco"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                  <input
                    value={regLocation}
                    onChange={(e) => setRegLocation(e.target.value)}
                    placeholder="Ciudad / País"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    required
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Contraseña *"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                  <input
                    required
                    type="password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repetir clave *"
                    className="rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2.5 text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                  />
                </div>

                <input
                  value={regInvite}
                  onChange={(e) => setRegInvite(e.target.value.toUpperCase())}
                  placeholder="Código familiar"
                  className="w-full rounded-xl border border-[#D4D2DF] bg-[#F7F6FA] px-3 py-2 font-mono text-xs text-[#1D1B29] focus:border-[#763CD2] focus:bg-white focus:outline-none"
                />

                <button
                  type="submit"
                  className="mt-1 h-[46px] w-full rounded-full text-sm font-bold text-white shadow-[0_8px_22px_rgba(88,36,178,0.34)] transition hover:brightness-105"
                  style={{
                    background: 'linear-gradient(90deg, #8B4FD9 0%, #6A31C3 54%, #471DA6 100%)',
                  }}
                >
                  Crear mi cuenta y entrar
                </button>
              </form>
            </div>
          )}

          {/* ================= MODE 3: SOLE ADMIN (PASSWORD ONLY, NO USERNAME!) ================= */}
          {mode === 'ADMIN' && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[#5B2CB5] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio familiar
              </button>

              <div className="mb-5 text-center">
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #8B4FD9 0%, #471DA6 100%)',
                  }}
                >
                  <KeyRound className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-[#111118]">Administrador</h2>
                <p className="mt-1 text-xs text-[#726E82]">
                  Acceso exclusivo de Adrián · ingresa únicamente tu contraseña maestra (sin usuario).
                </p>
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = loginAsAdminPasswordOnly(adminPassword);
                  if (!res.ok) setError(res.error ?? 'Contraseña incorrecta.');
                }}
                className="space-y-4"
              >
                <div className="relative">
                  <Lock
                    strokeWidth={1.75}
                    className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#767387]"
                  />
                  <input
                    required
                    autoFocus
                    type={showAdminPass ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Contraseña maestra"
                    className="h-[48px] w-full rounded-[14px] border border-[#D4D2DF] bg-[#F7F6FA] pl-11 pr-11 text-[14.5px] text-[#1D1B29] placeholder:text-[#767387] transition focus:border-[#763CD2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#763CD2]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPass((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#767387] hover:bg-[#ECEAF4]"
                  >
                    {showAdminPass ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-bold text-white shadow-[0_8px_22px_rgba(88,36,178,0.34)] transition hover:brightness-105"
                  style={{
                    background: 'linear-gradient(90deg, #8B4FD9 0%, #6A31C3 54%, #471DA6 100%)',
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Entrar como Administrador
                </button>

                <p className="text-center text-[11px] text-[#7C788C]">
                  Clave inicial: <code className="font-bold text-[#5B2CB5]">nazco2026</code>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Ultra-discreet Admin lock trigger in bottom-right corner so the card stays 100% faithful to reference */}
      {mode !== 'ADMIN' && (
        <button
          type="button"
          onClick={() => {
            setMode('ADMIN');
            setError(null);
          }}
          className="fixed bottom-3 right-4 z-20 inline-flex items-center gap-1 rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium text-white/60 backdrop-blur-sm transition hover:bg-black/40 hover:text-white"
          title="Acceso exclusivo Administrador (solo contraseña)"
        >
          <Lock className="h-3 w-3" />
          <span>Admin</span>
        </button>
      )}
    </div>
  );
};
