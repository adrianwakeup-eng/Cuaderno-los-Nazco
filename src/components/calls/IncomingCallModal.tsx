import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { startIncomingRingtone } from '../../services/pushNotificationService';
import type { CallMode, FamilyMember } from '../../types';
import { MemberAvatar } from '../auth/FamilyAuthModal';
import { AmigurumiPhone } from '../crochet/CrochetArt';

interface IncomingCallModalProps {
  caller: FamilyMember | null;
  mode: CallMode;
  isPreview?: boolean;
  onAccept: () => void;
  onReject: () => void;
}

/** Accessible incoming call screen with animated crochet frame, audible ringtone & amigurumi phone */
export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  caller,
  mode,
  isPreview = false,
  onAccept,
  onReject,
}) => {
  const { triggerFeedback } = useAppearance();

  useEffect(() => {
    if (!caller) return;
    const stopRing = startIncomingRingtone();
    return () => stopRing();
  }, [caller?.id]);

  if (!caller) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-900/90 p-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={`Llamada entrante de ${caller.name}`}
    >
      <div className="crochet-parchment animate-pop-in w-full max-w-sm rounded-[32px] p-7 text-center shadow-2xl">
        {isPreview && (
          <span className="mb-3 inline-block rounded-full bg-ocean-600 px-3 py-1 text-[10px] font-bold text-white">
            Vista previa interactiva de llamada entrante
          </span>
        )}

        <div className="mx-auto mb-3 flex justify-center">
          <AmigurumiPhone className="h-14 w-14" />
        </div>

        {/* Large family photo inside animated crochet ring */}
        <div className="mx-auto my-4 inline-flex rounded-full border-4 border-dashed border-brazil-500 p-2 shadow-[0_0_28px_rgba(242,196,67,0.65)] animate-heartbeat">
          <MemberAvatar member={caller} size="xl" showPresence />
        </div>

        <p className="text-xs font-extrabold uppercase tracking-wider text-forest-700">
          {mode === 'VIDEO' ? '📹 Videollamada entrante' : '📞 Llamada de voz entrante'}
        </p>
        <h2 className="mt-1 font-editorial text-3xl font-bold text-espresso-900">{caller.name}</h2>
        <p className="text-sm font-semibold text-espresso-700">{caller.relationship}</p>

        {/* Huge Accessible Green Accept & Red Decline Buttons */}
        <div className="mt-7 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              onReject();
            }}
            className="btn-yarn-press flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-3xl bg-rose-600 text-white shadow-lg hover:bg-rose-700"
          >
            <PhoneOff className="h-6 w-6" />
            <span className="text-sm font-bold">Colgar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerFeedback('chime');
              onAccept();
            }}
            className="crochet-green-3d btn-yarn-press flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-3xl text-white"
          >
            {mode === 'VIDEO' ? (
              <Video className="h-6 w-6 text-solar-300" />
            ) : (
              <Phone className="h-6 w-6 text-solar-300" />
            )}
            <span className="text-sm font-bold">Contestar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
