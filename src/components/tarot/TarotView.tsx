import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MoonStar, Sparkles, Volume2, X } from 'lucide-react';
import reader from './lector.webp';
import readerHands from './lector-manos.webp';
import readerMotion from './lector-bucle.mp4';
import { TarotPalmLights } from './TarotPalmLights';
import './tarot.css';

const deck = [
  { name: 'El Sol', artwork: 0, reading: 'Haz espacio para lo que te devuelve la alegría.', action: 'Escribe a alguien con quien siempre te ríes y proponle un momento para ponerse al día.' },
  { name: 'La Luna', artwork: 1, reading: 'Date tiempo para entender lo que hoy parece confuso.', action: 'Anota qué sabes, qué estás suponiendo y una pregunta que te ayudaría a aclararlo.' },
  { name: 'La Estrella', artwork: 2, reading: 'Elige un pequeño paso hacia algo que te ilusiona.', action: 'Elige algo que te ilusiona y dedícale diez minutos hoy.' },
  { name: 'La Fuerza', artwork: 3, reading: 'La paciencia también es una forma de valentía.', action: 'Antes de responder a algo que te irrite, respira y escribe lo que quieres decir en una sola frase.' },
  { name: 'La Templanza', artwork: 4, reading: 'Busca equilibrio entre dar a los demás y cuidar de ti.', action: 'Aparta un rato para ayudar a alguien y otro para descansar tú.' },
  { name: 'El Ermitaño', artwork: 5, reading: 'Reserva un momento de calma para escucharte.', action: 'Pasa cinco minutos sin pantalla y anota la idea que más se repita.' },
  { name: 'El Mundo', artwork: 6, reading: 'Reconoce algo que has terminado antes de empezar lo siguiente.', action: 'Escribe una cosa que terminaste esta semana y celebra ese avance con un gesto sencillo.' },
  { name: 'La Emperatriz', artwork: 7, reading: 'Dedica tiempo a algo que quieras ver crecer.', action: 'Cuida una planta, prepara algo en casa o dedica quince minutos a un proyecto creativo.' },
  { name: 'El Mago', artwork: 8, reading: 'Empieza con los recursos que ya tienes a mano.', action: 'Escoge una tarea pendiente y empieza con algo que ya tienes a mano.' },
  { name: 'La Rueda', artwork: 9, reading: 'Observa qué puedes ajustar cuando cambien tus planes.', action: 'Si cambia un plan, anota dos alternativas sencillas y elige una.' },
  { name: 'La Justicia', artwork: 10, reading: 'Antes de decidir, escucha las dos versiones.', action: 'Si hay un desacuerdo, pregunta primero cómo lo vivió la otra persona.' },
  { name: 'El Carro', artwork: 11, reading: 'Escoge una dirección y concentra ahí tu energía.', action: 'Elige una prioridad y reserva veinte minutos para avanzar sin interrupciones.' },
];

const artworkFiles = import.meta.glob<string>('./cartas/*.webp', {
  eager: true, import: 'default', query: '?url',
});

const narrationFiles = import.meta.glob<string>('./voz/*.mp3', {
  eager: true, import: 'default', query: '?url',
});

const getArtwork = (card: (typeof deck)[number]) => artworkFiles[`./cartas/${card.artwork}.webp`];

const positions = ['Energía de hoy', 'El desafío', 'Tu guía'];

function drawDailyCards(date: Date) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  let seed = day;
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    seed = (Math.imul(1_664_525, seed) + 1_013_904_223) >>> 0;
    const j = Math.floor((seed / 4_294_967_296) * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards.slice(0, positions.length);
}

export function TarotView({ onBack }: { onBack: () => void }) {
  const cards = useMemo(() => drawDailyCards(new Date()), []);
  const [revealed, setRevealed] = useState<number[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [audioMessage, setAudioMessage] = useState('');
  const readerRef = useRef<HTMLVideoElement>(null);
  const [lightBurst, setLightBurst] = useState(0);
  const [readerPlaying, setReaderPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setReaderPlaying(false);
    };
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  const narrationRef = useRef<HTMLAudioElement | null>(null);
  const detailRef = useRef<HTMLDialogElement>(null);
  const previewRef = useRef<HTMLButtonElement>(null);
  const tableCards = useRef<(HTMLSpanElement | null)[]>([]);
  const flightRef = useRef<Animation | null>(null);
  const closingRef = useRef(false);
  const activeCard = selectedIndex === null ? null : cards[selectedIndex];

  const stopNarration = () => {
    narrationRef.current?.pause();
    narrationRef.current = null;
  };

  const readCard = (index: number) => {
    stopNarration();
    const track = narrationFiles[`./voz/${cards[index].artwork}.mp3`];
    if (!track) {
      setAudioMessage('La narración de esta carta no está disponible.');
      return;
    }
    const audio = new Audio(track);
    narrationRef.current = audio;
    setAudioMessage('');
    void audio.play().catch(() => {
      if (narrationRef.current === audio) {
        setAudioMessage('No se pudo reproducir la voz. Puedes volver a pulsar Escuchar.');
      }
    });
  };

  const openCard = (index: number) => {
    if (selectedIndex !== null) return;
    setRevealed((current) => current.includes(index) ? current : [...current, index]);
    setSelectedIndex(index);
    setLightBurst((value) => value + 1);
    readCard(index);
  };

  const getTableTransform = (index: number) => {
    const from = tableCards.current[index]?.getBoundingClientRect();
    const to = previewRef.current?.getBoundingClientRect();
    if (!from || !to || !to.width || !to.height) return null;
    const x = from.left + from.width / 2 - to.left - to.width / 2;
    const y = from.top + from.height / 2 - to.top - to.height / 2;
    const angle = [-7, 1, 8][index];
    return `translate3d(${x}px,${y}px,0) perspective(850px) rotateX(61deg) rotateZ(${angle}deg) scale(${from.width / to.width})`;
  };

  useLayoutEffect(() => {
    const dialog = detailRef.current;
    const preview = previewRef.current;
    if (selectedIndex === null || !dialog || !preview) return;
    if (!dialog.open) dialog.showModal();
    const tableTransform = getTableTransform(selectedIndex);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!tableTransform || reduceMotion) {
      dialog.dataset.visible = 'true';
      return;
    }
    const fadeFrame = requestAnimationFrame(() => {
      if (!closingRef.current) dialog.dataset.visible = 'true';
    });
    flightRef.current = preview.animate([
      { transform: tableTransform },
      { transform: 'translate3d(0,0,0) perspective(850px) rotateX(0deg) rotateZ(0deg) scale(1)' },
    ], { duration: 850, easing: 'cubic-bezier(.38,0,.2,1)' });
    return () => {
      cancelAnimationFrame(fadeFrame);
      flightRef.current?.cancel();
      flightRef.current = null;
    };
  }, [selectedIndex]);

  const returnToTable = () => {
    const dialog = detailRef.current;
    const preview = previewRef.current;
    if (!dialog?.open || !preview || selectedIndex === null || closingRef.current) return;
    stopNarration();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startingTransform = getComputedStyle(preview).transform;
    flightRef.current?.cancel();
    const tableTransform = getTableTransform(selectedIndex);
    if (reduceMotion || !tableTransform) {
      dialog.close();
      return;
    }
    closingRef.current = true;
    dialog.dataset.returning = 'true';
    delete dialog.dataset.visible;
    const flight = preview.animate([{ transform: startingTransform }, { transform: tableTransform }],
      { duration: 680, easing: 'cubic-bezier(.42,0,.32,1)', fill: 'forwards' });
    flightRef.current = flight;
    flight.finished.then(() => dialog.close(), () => {});
  };

  useEffect(() => () => narrationRef.current?.pause(), []);

  return (
    <section className="tarot-room mx-auto max-w-2xl" aria-labelledby="tarot-title">
      <div className="tarot-heading">
        <button type="button" className="tarot-back" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Volver al muro
        </button>
        <h1 id="tarot-title" className="font-editorial"><MoonStar aria-hidden="true" /> Tarot del día</h1>
        <p>Toca las tres cartas para descubrir tu lectura simbólica de hoy.</p>
      </div>
      <div className="tarot-table" data-revealing={revealed.length > 0} data-motion-video={readerPlaying}>
        <img className="tarot-reader" src={reader} alt="El lector de tarot detrás de su mesa de cartas"
          width={928} height={1152} fetchPriority="high" />
        <img className="tarot-reader tarot-reader-hands" src={readerHands} alt=""
          width={928} height={1152} decoding="async" aria-hidden="true" />
        {!reducedMotion && (
          <video ref={readerRef} className="tarot-reader tarot-reader-motion" data-playing={readerPlaying}
            src={readerMotion} poster={readerHands} autoPlay muted loop playsInline preload="metadata"
            onPlaying={() => setReaderPlaying(true)} onError={() => setReaderPlaying(false)}
            aria-hidden="true" />
        )}
        {readerPlaying && !reducedMotion && <TarotPalmLights videoRef={readerRef} burst={lightBurst} />}
        {!readerPlaying && revealed.length > 0 && (
          <div className="tarot-light-show" key={revealed.length} aria-hidden="true">
            <span className="tarot-light-rays" />
            <span className="tarot-palm-glow tarot-palm-glow-left" />
            <span className="tarot-palm-glow tarot-palm-glow-right" />
          </div>
        )}
        <div className="tarot-deck">
          {cards.map((card, index) => {
            const isRevealed = revealed.includes(index);
            return (
              <button key={card.name} type="button" className="tarot-card" data-lifted={selectedIndex === index}
                aria-label={isRevealed ? `${positions[index]}: ${card.name}. ${card.reading}` : `Revelar carta: ${positions[index]}`}
                onClick={() => openCard(index)}>
                <span className="tarot-card-flip" data-revealed={isRevealed} aria-hidden="true"
                  ref={(node) => { tableCards.current[index] = node; }}>
                  <span className="tarot-card-face tarot-card-back"><Sparkles /><span>Destino</span></span>
                  <span className="tarot-card-face tarot-card-front">
                    {isRevealed && <img src={getArtwork(card)} alt="" />}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="tarot-reading" aria-live="polite">
        {cards.map((card, index) => revealed.includes(index) && (
          <div key={card.name}>
            <h2>{positions[index]} · {card.name}</h2>
            <p>{card.reading}</p>
            <p><strong>Consejo del lector:</strong> {card.action}</p>
          </div>
        ))}
      </div>
      <dialog ref={detailRef} className="tarot-detail" aria-label="Lectura de la carta"
        onClose={() => {
          stopNarration();
          closingRef.current = false;
          if (detailRef.current) {
            delete detailRef.current.dataset.returning;
            delete detailRef.current.dataset.visible;
          }
          setAudioMessage('');
          setSelectedIndex(null);
        }}
        onCancel={(event) => { event.preventDefault(); returnToTable(); }}
        onClick={(event) => { if (event.target === event.currentTarget) returnToTable(); }}>
        {activeCard && selectedIndex !== null && (
          <div className="tarot-detail-content">
            <button type="button" className="tarot-detail-close" aria-label="Cerrar carta"
              onClick={returnToTable}><X aria-hidden="true" size={23} /></button>
            <button ref={previewRef} className="tarot-detail-card" type="button"
              onClick={returnToTable} aria-label={`${activeCard.name}: volver a la mesa`}>
              <img className="tarot-detail-art" src={getArtwork(activeCard)} alt="" />
            </button>
            <div className="tarot-detail-text">
              <p>{positions[selectedIndex]}</p>
              <h2 className="font-editorial">{activeCard.name}</h2>
              <p>{activeCard.reading}</p>
              <p><strong>Consejo del lector:</strong> {activeCard.action}</p>
              <button type="button" className="tarot-listen" onClick={() => readCard(selectedIndex)}>
                <Volume2 size={18} aria-hidden="true" /> Escuchar
              </button>
              {audioMessage && <p role="status">{audioMessage}</p>}
              <button type="button" className="tarot-back tarot-return" onClick={returnToTable}>
                <ArrowLeft size={17} aria-hidden="true" /> Volver a la mesa
              </button>
            </div>
          </div>
        )}
      </dialog>
      <p className="px-4 pb-3 pt-2 text-center text-xs text-[#f1d9a8]">
        Ilustraciones de Pamela Colman Smith · Rider–Waite–Smith
      </p>
    </section>
  );
}
