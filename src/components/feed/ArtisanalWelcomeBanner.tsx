import React, { useRef, useState } from 'react';
import { Globe2, Heart, Video } from 'lucide-react';
import { useAppearance } from '../../context/AppearanceContext';
import { useFamilyApp } from '../../context/FamilyAppContext';
import {
  CrochetBrazilGlobeMini,
  CrochetCamera3D,
  CrochetHeart3D,
  CrochetSunflower,
} from '../crochet/CrochetArt';

/** Horizontally swipeable Brazilian crochet welcome banner matching official reference */
export const ArtisanalWelcomeBanner: React.FC = () => {
  const { currentUser, setActiveSection, triggerJoyBurst } = useFamilyApp();
  const { triggerFeedback } = useAppearance();
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const firstName = currentUser?.name.split(' ')[0] ?? 'Familia';

  const handleTouchEnd = (endX: number) => {
    if (touchStartX.current === null) return;
    const dx = endX - touchStartX.current;
    if (dx < -45) {
      triggerFeedback('tap');
      setSlide((s) => (s + 1) % 2);
    } else if (dx > 45) {
      triggerFeedback('tap');
      setSlide((s) => (s + 1) % 2);
    }
    touchStartX.current = null;
  };

  return (
    <section
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0].clientX)}
      className="relative overflow-hidden rounded-[26px] border-2 border-artisanal-500/80 shadow-[0_14px_30px_-10px_rgba(22,77,50,0.34)]"
      style={{
        background:
          'linear-gradient(135deg, #164D32 0%, #256B3F 36%, #9A6E31 74%, #16466C 100%)',
      }}
      aria-label="Bienvenida familiar artesanal"
    >
      {/* Twinkling fairy lights across top inside banner */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around px-4 pt-1.5 opacity-90">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            style={{ animationDelay: `${i * 0.35}s` }}
            className="animate-fairy-twinkle h-2.5 w-2.5 rounded-full bg-solar-200 shadow-[0_0_12px_4px_rgba(242,196,67,0.85)]"
          />
        ))}
      </div>

      {/* SLIDE 0: Exact official reference composition */}
      {slide === 0 ? (
        <div className="relative flex min-h-[156px] items-center gap-3 p-3.5 sm:min-h-[188px] sm:gap-4 sm:p-5">
          {/* Left Woven Crochet Parchment Message */}
          <div className="crochet-parchment relative z-10 flex-1 rounded-2xl px-4 py-3.5 text-center sm:px-5 sm:py-4">
            <h2 className="font-crochet-script text-2xl font-bold leading-tight text-espresso-900 sm:text-3xl">
              Qué alegría verte aquí,
              <br />
              <span className="text-forest-800">{firstName} 💛</span>
            </h2>
            <p className="mx-auto mt-1.5 max-w-[260px] text-[11px] font-medium leading-snug text-espresso-700 sm:text-xs">
              Cada foto, nota de voz y abrazo queda guardado para siempre en nuestro cuaderno privado.
            </p>
          </div>

          {/* Right Clothespin Polaroid + 3D Crochet Heart + Crochet Brazil Globe */}
          <div className="relative z-10 hidden w-44 shrink-0 flex-col items-end sm:flex md:w-48">
            <div className="relative -rotate-2 rounded-lg border-[3px] border-white bg-cotton-50 p-1 shadow-lg">
              {/* Clothespin detail */}
              <span className="absolute -top-2.5 left-1/2 h-4 w-2 -translate-x-1/2 rounded-sm bg-artisanal-500 shadow" />
              <img
                src="./textures/family-album-hero.jpg"
                alt="Recuerdo familiar · Cuaderno Social de la familia"
                className="h-24 w-36 rounded object-cover"
              />
            </div>

            <div className="-mt-6 flex items-end gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('heart');
                  triggerJoyBurst('❤️', 10);
                }}
                className="btn-yarn-press -mr-2 mb-1"
                title="Enviar lluvia de corazones tejidos"
              >
                <CrochetHeart3D className="h-11 w-11 animate-heartbeat" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setActiveSection('FAMILY');
                }}
                className="btn-yarn-press"
                title="Abrir Nuestros hilos por el mundo"
              >
                <CrochetBrazilGlobeMini className="h-16 w-16 transition hover:scale-105" />
              </button>
            </div>
          </div>

          {/* Mobile compact decorative 3D accents (camera + heart + mini globe) */}
          <div className="pointer-events-none absolute -bottom-1.5 -left-1 z-20 sm:bottom-1 sm:left-2">
            <CrochetCamera3D className="h-12 w-14 sm:h-14 sm:w-16" />
          </div>
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 sm:hidden">
            <button
              type="button"
              onClick={() => {
                triggerFeedback('heart');
                triggerJoyBurst('❤️', 9);
              }}
              aria-label="Lluvia de corazones"
              className="btn-yarn-press"
            >
              <CrochetHeart3D className="h-8 w-8 animate-heartbeat" />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerFeedback('tap');
                setActiveSection('FAMILY');
              }}
              aria-label="Ver familia en el mundo"
              className="btn-yarn-press"
            >
              <CrochetBrazilGlobeMini className="h-11 w-11" />
            </button>
          </div>
        </div>
      ) : (
        /* SLIDE 1: Quick Family Shortcuts Slide (Swipeable!) */
        <div className="relative flex min-h-[156px] items-center justify-between gap-3 p-4 sm:min-h-[188px] sm:p-5">
          <div className="crochet-parchment relative z-10 flex-1 rounded-2xl p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-forest-700">
              🇧🇷 Nuestros hilos por el mundo
            </p>
            <h2 className="mt-0.5 font-editorial text-xl font-bold text-espresso-900 sm:text-2xl">
              Siempre cerca, estemos donde estemos
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setActiveSection('FAMILY');
                }}
                className="crochet-green-3d btn-yarn-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-white"
              >
                <Globe2 className="h-3.5 w-3.5 text-solar-300" />
                Explorar globo 3D
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('tap');
                  setActiveSection('CALLS');
                }}
                className="crochet-gold-3d btn-yarn-press inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold text-forest-900"
              >
                <Video className="h-3.5 w-3.5" />
                Sala Familiar
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerFeedback('heart');
                  triggerJoyBurst('💖', 12);
                }}
                className="btn-yarn-press inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow"
              >
                <Heart className="h-3.5 w-3.5 fill-current" />
                Cariño
              </button>
            </div>
          </div>
          <div className="hidden shrink-0 sm:block">
            <CrochetSunflower className="h-24 w-24 animate-float-gentle" />
          </div>
        </div>
      )}

      {/* Carousel Pagination Dots (exact reference detail) */}
      <div className="relative z-20 flex items-center justify-center gap-2 pb-2.5">
        {[0, 1].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              triggerFeedback('tap');
              setSlide(idx);
            }}
            aria-label={`Diapositiva ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${
              slide === idx ? 'w-5 bg-solar-300 shadow' : 'w-2 bg-white/60 hover:bg-white'
            }`}
          />
        ))}
      </div>
    </section>
  );
};
