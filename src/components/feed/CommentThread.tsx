import React, { useState } from 'react';
import { CornerDownRight, Send, Smile, Trash2 } from 'lucide-react';
import { useFamilyApp } from '../../context/FamilyAppContext';
import type { PostComment } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { StickerGifBadge, StickerGifPicker } from '../shared/StickerGifPicker';

interface CommentThreadProps {
  postId: string;
  comments: PostComment[];
}

function relativeTime(iso: string): string {
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export const CommentThread: React.FC<CommentThreadProps> = ({ postId, comments }) => {
  const { snapshot, currentUser, addComment, deleteComment, openProfile } = useFamilyApp();
  if (!currentUser) return null;

  const [newComment, setNewComment] = useState('');
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const membersById = new Map(snapshot.members.map((m) => [m.id, m]));
  const rootComments = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, PostComment[]>();
  comments
    .filter((c) => Boolean(c.parentId))
    .forEach((c) => {
      const list = repliesByParent.get(c.parentId!) ?? [];
      list.push(c);
      repliesByParent.set(c.parentId!, list);
    });

  const renderComment = (comment: PostComment, isReply = false) => {
    const author = membersById.get(comment.authorId);
    const canDelete = currentUser.role === 'ADMIN' || comment.authorId === currentUser.id;
    const replies = repliesByParent.get(comment.id) ?? [];

    return (
      <div key={comment.id} className={isReply ? 'ml-9 mt-2' : 'mt-2.5'}>
        <div className="flex items-start gap-2.5">
          {author && (
            <button onClick={() => openProfile(author.id)} className="shrink-0">
              <MemberAvatar member={author} size="xs" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <div className="inline-block max-w-full rounded-2xl bg-amber-50/90 px-3.5 py-2 ring-1 ring-amber-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => author && openProfile(author.id)}
                  className="text-xs font-bold text-espresso-900 hover:underline"
                >
                  {author?.name ?? 'Familiar'}
                </button>
                <span className="text-[11px] text-espresso-500">
                  {relativeTime(comment.createdAt)}
                </span>
              </div>
              {comment.text && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-espresso-900">
                  {comment.text}
                </p>
              )}
              {comment.stickerId && (
                <div className="mt-1.5">
                  <StickerGifBadge stickerId={comment.stickerId} compact />
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 pl-2 text-[11px] font-semibold text-espresso-500">
              {!isReply && (
                <button
                  onClick={() => {
                    setReplyingToId(replyingToId === comment.id ? null : comment.id);
                    setReplyText('');
                  }}
                  className="inline-flex items-center gap-1 hover:text-terracotta-600"
                >
                  <CornerDownRight className="h-3 w-3" />
                  Responder
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => deleteComment(postId, comment.id)}
                  className="inline-flex items-center gap-1 text-rose-600/80 hover:text-rose-700"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              )}
            </div>

            {replyingToId === comment.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!replyText.trim()) return;
                  addComment(postId, replyText, comment.id);
                  setReplyText('');
                  setReplyingToId(null);
                }}
                className="mt-2 flex items-center gap-2"
              >
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Responder a ${author?.name.split(' ')[0] ?? 'familiar'}…`}
                  autoFocus
                  className="flex-1 rounded-full border border-amber-200 bg-white px-3.5 py-1.5 text-sm focus:border-terracotta-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-full bg-terracotta-600 p-2 text-white hover:bg-terracotta-700"
                  aria-label="Enviar respuesta"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {replies.map((reply) => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <div className="mt-3 border-t border-amber-100 pt-3">
      {rootComments.map((c) => renderComment(c, false))}

      {showStickerPicker && (
        <div className="mt-3">
          <StickerGifPicker
            onSelect={(item) => {
              addComment(postId, newComment, null, item.id);
              setNewComment('');
              setShowStickerPicker(false);
            }}
            onClose={() => setShowStickerPicker(false)}
          />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newComment.trim()) return;
          addComment(postId, newComment, null);
          setNewComment('');
        }}
        className="mt-3 flex items-center gap-2"
      >
        <MemberAvatar member={currentUser} size="xs" />
        <button
          type="button"
          onClick={() => setShowStickerPicker((v) => !v)}
          className="rounded-full p-2 text-pink-600 transition hover:bg-pink-50"
          title="Comentar con Sticker o GIF"
        >
          <Smile className="h-4 w-4" />
        </button>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Escribe un comentario cariñoso…"
          className="flex-1 rounded-full border border-amber-200 bg-amber-50/50 px-4 py-2 text-sm text-espresso-900 placeholder:text-espresso-500 focus:border-terracotta-500 focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newComment.trim()}
          className="rounded-full bg-terracotta-600 p-2.5 text-white transition hover:bg-terracotta-700 disabled:opacity-40"
          aria-label="Enviar comentario"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};
