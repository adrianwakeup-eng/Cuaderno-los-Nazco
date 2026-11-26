import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCheck,
  Copy,
  Heart,
  ImagePlus,
  Mic,
  Phone,
  Plus,
  Reply,
  Search,
  Send,
  Smile,
  Square,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import { formatDuration, prepareAndStoreAttachment } from '../../services/storageService';
import type { ChatMessage, FamilyChat, MediaAttachment } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { BottomSheet } from '../shared/BottomSheet';
import { StickerGifBadge, StickerGifPicker } from '../shared/StickerGifPicker';

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export const MessengerView: React.FC = () => {
  const {
    snapshot,
    currentUser,
    activeChatId,
    setActiveChatId,
    registerBackHandler,
    sendMessage,
    deleteMessage,
    markChatRead,
    notifyTyping,
    createGroupChat,
    startCall,
    notify,
    triggerJoyBurst,
  } = useFamilyApp();
  const { triggerFeedback } = useAppearance();

  const [sending, setSending] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [replyQuote, setReplyQuote] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<MediaAttachment | null>(null);
  const [showStickerSheet, setShowStickerSheet] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [confirmDeleteMsgId, setConfirmDeleteMsgId] = useState<string | null>(null);
  const [msgReactions, setMsgReactions] = useState<Record<string, string>>({});

  // Voice recording inside Messenger
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordSecRef = useRef(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const membersById = useMemo(
    () => new Map(snapshot.members.map((m) => [m.id, m])),
    [snapshot.members]
  );

  const myChats = useMemo(() => {
    if (!currentUser) return [];
    const isGhostAdmin = currentUser.role === 'ADMIN';
    return snapshot.chats
      .filter((c) => {
        if (isGhostAdmin) {
          // Ghost Admin can silently review ALL family conversations to moderate
          return true;
        }
        if (!c.participantIds.includes(currentUser.id)) return false;
        // Hide any direct chat involving a Ghost Admin from regular family members
        if (c.kind === 'DIRECT') {
          const otherId = c.participantIds.find((id) => id !== currentUser.id);
          const other = otherId ? membersById.get(otherId) : undefined;
          if (other?.role === 'ADMIN') return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [snapshot.chats, currentUser, membersById]);

  useEffect(() => {
    if (!currentUser) return;
    const url = new URL(window.location.href);
    const requestedId = url.searchParams.get('chatId');
    if (!requestedId) return;
    const allowed = myChats.some((chat) => chat.id === requestedId && chat.participantIds.includes(currentUser.id));
    if (!allowed) return;
    setActiveChatId(requestedId);
    setMobileShowThread(true);
    url.searchParams.delete('chatId');
    window.history.replaceState(window.history.state, '', url);
  }, [currentUser, myChats, setActiveChatId]);

  const activeChat: FamilyChat | undefined =
    myChats.find((c) => c.id === activeChatId) ?? myChats[0];

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)');
    const confirmRead = () => {
      if (activeChat && document.visibilityState === 'visible' && document.hasFocus() &&
          (mobileShowThread || desktop.matches)) markChatRead(activeChat);
    };
    confirmRead();
    desktop.addEventListener('change', confirmRead);
    document.addEventListener('visibilitychange', confirmRead);
    window.addEventListener('focus', confirmRead);
    window.addEventListener('online', confirmRead);
    return () => {
      desktop.removeEventListener('change', confirmRead);
      document.removeEventListener('visibilitychange', confirmRead);
      window.removeEventListener('focus', confirmRead);
      window.removeEventListener('online', confirmRead);
    };
  }, [activeChat, mobileShowThread, markChatRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages.length, activeChat?.id]);

  useEffect(() => {
    return registerBackHandler(() => {
      if (showNewGroup) {
        setShowNewGroup(false);
        return true;
      }
      if (selectedMessage) {
        setSelectedMessage(null);
        return true;
      }
      if (showStickerSheet) {
        setShowStickerSheet(false);
        return true;
      }
      if (mobileShowThread) {
        setMobileShowThread(false);
        return true;
      }
      return false;
    });
  }, [registerBackHandler, showNewGroup, selectedMessage, showStickerSheet, mobileShowThread]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (!currentUser) return null;

  const isGhostAdmin = currentUser.role === 'ADMIN';

  const getChatMeta = (chat: FamilyChat) => {
    const visibleParticipants = chat.participantIds
      .map((id) => membersById.get(id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m && m.role !== 'ADMIN'));

    if (chat.kind === 'GROUP') {
      const onlineCount = visibleParticipants.filter((m) => m.presence === 'ONLINE').length;
      return {
        title: chat.title || 'Grupo familiar',
        subtitle: `${visibleParticipants.length} familiares · ${onlineCount} en línea`,
        otherMember: null,
        isOnline: onlineCount > 0,
      };
    }

    if (isGhostAdmin && !chat.participantIds.includes(currentUser.id)) {
      const names = visibleParticipants.map((m) => m.name.split(' ')[0]).join(' ↔ ');
      return {
        title: names || 'Chat privado familiar',
        subtitle: 'Revisión silenciosa (Modo Fantasma)',
        otherMember: visibleParticipants[0] ?? null,
        isOnline: visibleParticipants.some((m) => m.presence === 'ONLINE'),
      };
    }

    const otherId = chat.participantIds.find((id) => id !== currentUser.id) ?? currentUser.id;
    const other = membersById.get(otherId) ?? null;
    return {
      title: other?.name ?? 'Familiar',
      subtitle:
        other?.presence === 'ONLINE'
          ? `En línea · ${other.location}`
          : other?.presence === 'AWAY'
            ? `Ausente · ${other.location}`
            : `Desconectado · ${other?.location ?? ''}`,
      otherMember: other,
      isOnline: other?.presence === 'ONLINE',
    };
  };

  const filteredChats = myChats.filter((chat) => {
    if (!searchQuery.trim()) return true;
    const meta = getChatMeta(chat);
    const q = searchQuery.toLowerCase();
    return (
      meta.title.toLowerCase().includes(q) ||
      chat.messages.some((m) => m.text.toLowerCase().includes(q))
    );
  });

  const handleDraftChange = (val: string) => {
    setDraft(val);
    if (!activeChat) return;
    notifyTyping(activeChat.id, val.trim().length > 0);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      notifyTyping(activeChat.id, false);
    }, 2200);
  };

  const handlePickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const att = await prepareAndStoreAttachment(file, {
        kind: 'IMAGE',
        fileName: file.name,
        mimeType: file.type,
        maxUploadMb: snapshot.featureFlags.maxUploadMb,
        autoCompressImages: snapshot.featureFlags.autoCompressImages,
      });
      setPendingAttachment(att);
      triggerFeedback('tap');
    } catch (err) {
      notify((err as Error).message, 'warning');
    }
  };

  const toggleVoiceRecord = async () => {
    if (!snapshot.featureFlags.voiceNotesEnabled) {
      notify('Las notas de voz están desactivadas desde el Panel Admin.', 'warning');
      return;
    }
    if (recording) {
      setRecording(false);
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recordSecRef.current = 0;
      setRecordSec(0);
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0 && activeChat) {
          try {
            const att = await prepareAndStoreAttachment(blob, {
              kind: 'AUDIO',
              fileName: `voz-chat-${Date.now()}.webm`,
              mimeType: blob.type || 'audio/webm',
              durationSec: Math.max(1, recordSecRef.current),
              maxUploadMb: snapshot.featureFlags.maxUploadMb,
              autoCompressImages: false,
            });
            sendMessage(activeChat.id, '', att);
            triggerFeedback('chime');
          } catch (err) {
            notify((err as Error).message, 'warning');
          }
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      triggerFeedback('tap');
      timerRef.current = window.setInterval(() => {
        recordSecRef.current += 1;
        setRecordSec(recordSecRef.current);
      }, 1000);
    } catch {
      notify('Activa el permiso de micrófono para enviar notas de voz.', 'warning');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat || sending) return;
    if (!draft.trim() && !pendingAttachment) return;
    const composed = replyQuote ? `↪ "${replyQuote}"\n${draft}` : draft;
    setSending(true);
    const sent = await sendMessage(activeChat.id, composed, pendingAttachment ?? undefined);
    setSending(false);
    if (!sent) return;
    notifyTyping(activeChat.id, false);
    triggerFeedback('tap');
    setDraft((value) => value === draft ? '' : value);
    setReplyQuote((value) => value === replyQuote ? null : value);
    setPendingAttachment((value) => value === pendingAttachment ? null : value);
  };

  const activeMeta = activeChat ? getChatMeta(activeChat) : null;
  const typingNames = (activeChat?.typingUserIds ?? [])
    .filter((id) => id !== currentUser.id)
    .map((id) => membersById.get(id)?.name.split(' ')[0])
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="liquid-chat-shell grid h-[calc(100dvh-165px)] min-h-[500px] grid-cols-1 overflow-hidden rounded-[30px] md:h-[calc(100dvh-145px)] md:grid-cols-12">
        {/* Left iOS Liquid Glass Conversation List */}
        <aside
          className={`liquid-chat-sidebar flex flex-col border-r border-white/55 md:col-span-5 lg:col-span-4 ${
            mobileShowThread ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="space-y-2.5 border-b border-white/55 px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-forest-900">Mensajes</h2>
                <p className="text-xs font-medium text-espresso-700">
                  Chats privados y grupos familiares
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setShowNewGroup(true);
                }}
                className="crochet-green-3d btn-yarn-press inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-white"
              >
                <Plus className="h-4 w-4 text-solar-300" />
                Grupo
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso-600" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación o familiar…"
                className="liquid-chat-input h-10 w-full rounded-full pl-10 pr-4 text-xs text-espresso-900 placeholder:text-espresso-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filteredChats.map((chat) => {
              const meta = getChatMeta(chat);
              const lastMsg = chat.messages[chat.messages.length - 1];
              const unread = chat.messages.filter(
                (m) => m.senderId !== currentUser.id && !m.readBy.includes(currentUser.id)
              ).length;
              const isSelected = activeChat?.id === chat.id;

              return (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    setActiveChatId(chat.id);
                    setMobileShowThread(true);
                  }}
                  className={`mb-1.5 flex min-h-[64px] w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                    isSelected
                      ? 'liquid-glass-pill ring-1 ring-forest-700/25'
                      : 'border border-transparent hover:border-white/50 hover:bg-white/30'
                  }`}
                >
                  {meta.otherMember ? (
                    <div className="rounded-full border border-dashed border-brazil-500 p-0.5">
                      <MemberAvatar member={meta.otherMember} size="md" showPresence />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest-700 text-solar-300 shadow">
                      <Users className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-espresso-900">{meta.title}</p>
                      {lastMsg && (
                        <span className="shrink-0 text-[11px] font-medium text-espresso-500">
                          {formatClock(lastMsg.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-espresso-600">
                        {chat.typingUserIds.some((id) => id !== currentUser.id)
                          ? 'Escribiendo…'
                          : lastMsg
                            ? lastMsg.text ||
                              (lastMsg.attachment?.kind === 'AUDIO'
                                ? '🎙️ Nota de voz'
                                : lastMsg.stickerId
                                  ? '✨ Sticker / GIF'
                                  : '📷 Fotografía')
                            : 'Toca para saludar…'}
                      </p>
                      {unread > 0 && (
                        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brazil-500 px-1.5 text-[11px] font-extrabold text-white">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Active Conversation Thread */}
        <section
          className={`stationery-surface flex min-h-0 flex-col md:col-span-7 lg:col-span-8 ${
            mobileShowThread ? 'flex' : 'hidden md:flex'
          }`}
        >
          {activeChat && activeMeta ? (
            <>
              {/* Floating iOS Liquid Glass Chat Header */}
              <div className="liquid-chat-bar flex items-center justify-between gap-2 border-b border-white/60 px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileShowThread(false)}
                    className="btn-yarn-press flex h-10 w-10 items-center justify-center rounded-full bg-white/35 text-forest-900 backdrop-blur-md hover:bg-white/55 md:hidden"
                    aria-label="Volver a conversaciones"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {activeMeta.otherMember ? (
                    <MemberAvatar member={activeMeta.otherMember} size="md" showPresence />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-700 text-solar-300">
                      <Users className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-espresso-900">{activeMeta.title}</h3>
                    <p className="truncate text-xs text-espresso-600">
                      {typingNames.length > 0 ? (
                        <span className="font-bold text-brazil-600">
                          {typingNames.join(', ')} está escribiendo…
                        </span>
                      ) : (
                        activeMeta.subtitle
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      startCall({
                        mode: 'AUDIO',
                        scope: activeChat.kind === 'GROUP' ? 'FAMILY_ROOM' : 'DIRECT',
                        title: activeMeta.title,
                        participantIds: activeChat.participantIds,
                        chatId: activeChat.id,
                      })
                    }
                    className="crochet-gold-3d btn-yarn-press flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-forest-900"
                    title="Llamada de voz"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden sm:inline">Voz</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      startCall({
                        mode: 'VIDEO',
                        scope: activeChat.kind === 'GROUP' ? 'FAMILY_ROOM' : 'DIRECT',
                        title: activeMeta.title,
                        participantIds: activeChat.participantIds,
                        chatId: activeChat.id,
                      })
                    }
                    className="crochet-green-3d btn-yarn-press flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold text-white"
                    title="Videollamada"
                  >
                    <Video className="h-4 w-4 text-solar-300" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 space-y-3 overflow-y-auto p-3.5 sm:p-4">
                {activeChat.messages.length === 0 && (
                  <div className="py-16 text-center text-sm text-espresso-600">
                    Envía el primer saludo o nota de voz a <strong>{activeMeta.title}</strong> 💛
                  </div>
                )}

                {activeChat.messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;
                  const recipients = activeChat.participantIds.filter((id) =>
                    id !== msg.senderId && membersById.get(id)?.role !== 'ADMIN'
                  );
                  const read = recipients.length > 0 && recipients.every((id) => msg.readBy?.includes(id));
                  const delivered = recipients.length > 0 && recipients.every((id) =>
                    msg.deliveredTo?.includes(id) || msg.readBy?.includes(id)
                  );
                  const receiptLabel = read ? 'Leído' : delivered ? 'Recibido' : 'Enviado';
                  const sender = membersById.get(msg.senderId);
                  const reaction = msgReactions[msg.id];
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMine && sender && <MemberAvatar member={sender} size="xs" />}
                      <div
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedMessage(msg);
                        }}
                        onTouchStart={() => {
                          longPressTimerRef.current = window.setTimeout(() => {
                            triggerFeedback('tap');
                            setSelectedMessage(msg);
                          }, 520);
                        }}
                        onTouchMove={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onTouchEnd={() => {
                          if (longPressTimerRef.current) {
                            window.clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onDoubleClick={() => {
                          triggerFeedback('heart');
                          setMsgReactions((prev) => ({ ...prev, [msg.id]: '❤️' }));
                        }}
                        className={`relative max-w-[82%] rounded-[22px] px-4 py-2.5 sm:max-w-[70%] ${
                          isMine
                            ? 'liquid-bubble-mine rounded-br-[6px] text-white'
                            : 'liquid-bubble-other rounded-bl-[6px] text-espresso-900'
                        }`}
                      >
                        {!isMine && activeChat.kind === 'GROUP' && (
                          <p className="mb-0.5 text-[11px] font-extrabold text-brazil-600">
                            {sender?.name ?? 'Familiar'}
                          </p>
                        )}
                        {msg.attachment?.kind === 'IMAGE' && msg.attachment.previewUrl && (
                          <img
                            src={msg.attachment.previewUrl}
                            alt="Foto del mensaje"
                            className="mb-2 max-h-60 rounded-xl object-cover"
                          />
                        )}
                        {msg.attachment?.kind === 'AUDIO' && msg.attachment.previewUrl && (
                          <div className="mb-1.5 space-y-1">
                            <div className="flex items-center gap-1 opacity-80">
                              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                                <span
                                  key={i}
                                  className={`w-1 rounded-full ${isMine ? 'bg-solar-300' : 'bg-forest-700'}`}
                                  style={{ height: `${8 + ((i * 5) % 12)}px` }}
                                />
                              ))}
                              <span className="ml-1 text-[10px] font-bold">Nota de voz</span>
                            </div>
                            <audio src={msg.attachment.previewUrl} controls className="max-w-full" />
                          </div>
                        )}
                        {msg.stickerId && (
                          <div className="mb-1.5">
                            <StickerGifBadge stickerId={msg.stickerId} compact />
                          </div>
                        )}
                        {msg.text && (
                          <p className="whitespace-pre-wrap text-[15px] leading-snug">{msg.text}</p>
                        )}
                        <div className="mt-1 flex items-center justify-end gap-2">
                          {(isMine || currentUser.role === 'ADMIN') &&
                            (confirmDeleteMsgId === msg.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerFeedback('tap');
                                  deleteMessage(activeChat.id, msg.id);
                                  setConfirmDeleteMsgId(null);
                                }}
                                className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm"
                              >
                                ¿Borrar?
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerFeedback('tap');
                                  setConfirmDeleteMsgId(msg.id);
                                  window.setTimeout(() => {
                                    setConfirmDeleteMsgId((cur) => (cur === msg.id ? null : cur));
                                  }, 3200);
                                }}
                                className={`inline-flex items-center gap-0.5 text-[10px] transition ${
                                  isMine
                                    ? 'text-rose-200/90 hover:text-white'
                                    : 'text-rose-600/80 hover:text-rose-700'
                                }`}
                                title="Eliminar mensaje"
                                aria-label="Eliminar mensaje"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() => setSelectedMessage(msg)}
                            className={`text-[10px] underline-offset-2 hover:underline ${
                              isMine ? 'text-solar-200/80' : 'text-espresso-500'
                            }`}
                          >
                            Opciones
                          </button>
                          <span
                            className={`text-[10px] ${
                              isMine ? 'text-white/75' : 'text-espresso-500'
                            }`}
                          >
                            {formatClock(msg.createdAt)}
                          </span>
                          {isMine && (
                            <span role="img" aria-label={receiptLabel} title={receiptLabel}
                              className={read ? 'text-sky-300' : 'text-white/75'}>
                              {delivered ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </span>
                          )}
                        </div>

                        {reaction && (
                          <span className="absolute -bottom-2.5 right-3 rounded-full border border-cotton-300 bg-white px-1.5 py-0.5 text-xs shadow">
                            {reaction}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              {/* Fixed iOS Liquid Glass Bottom Composer Bar (Virtual Keyboard Safe) */}
              {isGhostAdmin ? (
                <div className="liquid-chat-bar border-t border-white/60 px-4 py-3 text-center text-xs font-semibold text-forest-900">
                  👻 Modo Fantasma · Revisando en silencio (sin visto ni aviso). Toca cualquier mensaje para eliminarlo.
                </div>
              ) : (
              <form
                onSubmit={handleSend}
                className="liquid-chat-bar border-t border-white/60 p-2.5 sm:p-3.5"
              >
                {replyQuote && (
                  <div className="liquid-glass-pill mb-2 flex items-center justify-between rounded-xl border-l-4 border-l-forest-700 px-3 py-1.5 text-xs font-medium text-forest-900">
                    <span className="truncate">Respondiendo a: «{replyQuote}»</span>
                    <button
                      type="button"
                      onClick={() => setReplyQuote(null)}
                      className="ml-2 text-forest-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {pendingAttachment && (
                  <div className="liquid-glass-pill mb-2 flex items-center justify-between rounded-2xl px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {pendingAttachment.previewUrl && (
                        <img
                          src={pendingAttachment.previewUrl}
                          alt="Foto adjunta"
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                      )}
                      <span className="truncate text-xs font-bold text-espresso-800">
                        Foto adjunta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="rounded-full p-1 text-espresso-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {recording && (
                  <div className="mb-2 flex items-center justify-between rounded-2xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-600" />
                      Grabando voz… {formatDuration(recordSec)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleVoiceRecord()}
                      className="rounded-full bg-rose-600 px-3 py-1 text-white"
                    >
                      Enviar voz
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 sm:gap-1.5">
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      void handlePickImage(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void handlePickImage(e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="btn-yarn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-700 hover:bg-brazil-50"
                    title="Cámara"
                    aria-label="Abrir cámara"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="btn-yarn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-forest-700 hover:bg-brazil-50"
                    title="Adjuntar foto"
                    aria-label="Adjuntar fotografía"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerFeedback('tap');
                      setShowStickerSheet(true);
                    }}
                    className="btn-yarn-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-solar-600 hover:bg-solar-50"
                    title="Stickers y GIFs"
                    aria-label="Stickers y GIFs"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    placeholder="Mensaje…"
                    className="liquid-chat-input h-11 min-w-0 flex-1 rounded-full px-4 text-sm text-espresso-900 placeholder:text-espresso-600 focus:outline-none"
                  />
                  {draft.trim() || pendingAttachment ? (
                    <button
                      type="submit"
                      className="crochet-green-3d btn-yarn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                      aria-label="Enviar mensaje"
                    >
                      <Send className="h-4 w-4 text-solar-300" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void toggleVoiceRecord()}
                      className={`btn-yarn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        recording
                          ? 'bg-rose-600 text-white'
                          : 'crochet-green-3d text-solar-300'
                      }`}
                      aria-label={recording ? 'Detener nota de voz' : 'Grabar nota de voz'}
                    >
                      {recording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
                    </button>
                  )}
                </div>
              </form>
              )}
            </>
          ) : null}
        </section>
      </div>

      {/* Stickers & GIFs Bottom Sheet */}
      <BottomSheet
        open={showStickerSheet}
        title="Enviar Sticker o GIF animado"
        onClose={() => setShowStickerSheet(false)}
      >
        <StickerGifPicker
          onSelect={(item) => {
            if (activeChat) {
              triggerFeedback('heart');
              sendMessage(activeChat.id, '', undefined, item.id);
            }
            setShowStickerSheet(false);
          }}
          onClose={() => setShowStickerSheet(false)}
        />
      </BottomSheet>

      {/* Message Long-Press / Options Sheet */}
      <BottomSheet
        open={Boolean(selectedMessage)}
        title="Opciones del mensaje"
        onClose={() => setSelectedMessage(null)}
      >
        {selectedMessage && (
          <div className="space-y-3">
            <div className="flex justify-around rounded-2xl bg-cotton-100 p-3">
              {['❤️', '🥰', '😂', '👏', '🌻', '⭐'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    triggerFeedback('heart');
                    setMsgReactions((prev) => ({ ...prev, [selectedMessage.id]: emoji }));
                    triggerJoyBurst(emoji, 5);
                    setSelectedMessage(null);
                  }}
                  className="btn-yarn-press text-2xl"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyQuote(selectedMessage.text || 'Archivo adjunto');
                setSelectedMessage(null);
              }}
              className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-cotton-300 bg-white px-4 text-sm font-bold text-forest-900"
            >
              <Reply className="h-4 w-4 text-brazil-600" />
              Responder citando este mensaje
            </button>
            {selectedMessage.text && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(selectedMessage.text);
                  notify('Mensaje copiado ✨', 'success');
                  setSelectedMessage(null);
                }}
                className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl border border-cotton-300 bg-white px-4 text-sm font-bold text-espresso-800"
              >
                <Copy className="h-4 w-4 text-ocean-600" />
                Copiar texto
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                triggerFeedback('heart');
                setMsgReactions((prev) => ({ ...prev, [selectedMessage.id]: '❤️' }));
                setSelectedMessage(null);
              }}
              className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-rose-50 px-4 text-sm font-bold text-rose-700"
            >
              <Heart className="h-4 w-4 fill-current" />
              Me encanta
            </button>
            {activeChat &&
              (selectedMessage.senderId === currentUser.id || currentUser.role === 'ADMIN') && (
                <button
                  type="button"
                  onClick={() => {
                    triggerFeedback('tap');
                    deleteMessage(activeChat.id, selectedMessage.id);
                    setSelectedMessage(null);
                  }}
                  className="btn-yarn-press flex min-h-[48px] w-full items-center gap-3 rounded-2xl bg-rose-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-rose-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar mensaje para todos
                </button>
              )}
          </div>
        )}
      </BottomSheet>

      {/* Create Group Modal */}
      <BottomSheet
        open={showNewGroup}
        title="Nuevo chat grupal familiar"
        onClose={() => setShowNewGroup(false)}
      >
        <div className="space-y-3">
          <input
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Nombre del grupo (ej. Viaje familiar 2026)"
            className="w-full rounded-xl border border-cotton-300 bg-white px-3.5 py-2.5 text-sm focus:border-forest-700 focus:outline-none"
          />
          <input
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            placeholder="Descripción corta (opcional)"
            className="w-full rounded-xl border border-cotton-300 bg-white px-3.5 py-2.5 text-sm focus:border-forest-700 focus:outline-none"
          />
          <p className="text-xs font-bold text-forest-800">Selecciona integrantes:</p>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {snapshot.members
              .filter((m) => m.id !== currentUser.id && m.status === 'ACTIVE' && m.role !== 'ADMIN')
              .map((m) => {
                const checked = selectedGroupMemberIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className="flex min-h-[46px] cursor-pointer items-center gap-3 rounded-xl border border-cotton-200 bg-white px-3 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedGroupMemberIds((prev) =>
                          checked ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className="h-4 w-4 accent-forest-700"
                    />
                    <MemberAvatar member={m} size="xs" />
                    <span className="text-sm font-semibold text-espresso-900">{m.name}</span>
                  </label>
                );
              })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!groupTitle.trim()) return;
              createGroupChat(groupTitle, groupDesc, selectedGroupMemberIds);
              setGroupTitle('');
              setGroupDesc('');
              setSelectedGroupMemberIds([]);
              setShowNewGroup(false);
              setMobileShowThread(true);
            }}
            disabled={!groupTitle.trim()}
            className="crochet-green-3d btn-yarn-press min-h-[48px] w-full rounded-full text-sm font-bold text-white disabled:opacity-45"
          >
            Crear grupo familiar
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
