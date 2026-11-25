import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Mobile-first animated Bottom Sheet with swipe-down-to-close + desktop centered modal */
export const BottomSheet: React.FC<BottomSheetProps> = ({ open, title, onClose, children }) => {
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  if (!open) return null;

  const sheet = (
    <div
      className="fixed inset-0 z-[85] flex h-[100dvh] items-end justify-center bg-forest-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          startYRef.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (startYRef.current === null) return;
          const dy = e.touches[0].clientY - startYRef.current;
          if (dy > 0) setDragY(dy);
        }}
        onTouchEnd={() => {
          if (dragY > 85) onClose();
          setDragY(0);
          startYRef.current = null;
        }}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
        className="animate-sheet-up card-crochet max-h-[88dvh] w-full overflow-hidden rounded-t-[28px] sm:max-w-lg sm:rounded-[28px]"
      >
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-artisanal-500/50" />
        </div>

        <div className="flex items-center justify-between border-b border-white/55 px-5 py-3.5">
          <h3 className="font-editorial text-lg font-bold text-forest-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="liquid-glass-pill btn-yarn-press flex h-10 w-10 items-center justify-center rounded-full text-espresso-800 hover:bg-white/70"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[74dvh] overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheet, document.body) : sheet;
};
