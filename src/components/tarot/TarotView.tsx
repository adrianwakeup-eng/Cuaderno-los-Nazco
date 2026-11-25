import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MoonStar, Sparkles, Volume2, X } from 'lucide-react';
import reader from './lector.webp';
import readerHands from './lector-manos.webp';
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
  const detailRef = useRef<HTMLDialogElement>(null);
  const activeCard = selectedIndex === null ? null : cards[selectedIndex];

  const readCard = (index: number) => {
    const card = cards[index];
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setAudioMessage('Este navegador no admite la lectura en voz alta.');
      return;
    }
    window.speechSynthesis.cancel();
    const narration = new SpeechSynthesisUtterance(
      `${positions[index]}. ${card.name}. ${card.reading} Mi consejo. ${card.action}`
    );
    const voices = window.speechSynthesis.getVoices();
    const spanish = voices.filter((voice) => /^es(?:[-_]|$)/i.test(voice.lang));
    const voice = spanish.find((item) => /natural|premium|enhanced|mejorada/i.test(item.name))
      ?? spanish.find((item) => /^es[-_](MX|US)$/i.test(item.lang)) ?? spanish[0];
    if (voice) narration.voice = voice;
    narration.lang = voice?.lang ?? 'es-MX';
    narration.rate = .89;
    narration.onstart = () => setAudioMessage('');
    narration.onerror = (event) => {
      if (event.error !== 'interrupted' && event.error !== 'canceled') {
        setAudioMessage('No se pudo reproducir la voz. Puedes volver a pulsar Escuchar.');
      }
    };
    setAudioMessage('');
    window.speechSynthesis.speak(narration);
  };

  const openCard = (index: number) => {
    setRevealed((current) => current.includes(index) ? current : [...current, index]);
    setSelectedIndex(index);
    readCard(index);
  };

  useEffect(() => {
    const dialog = detailRef.current;
    if (selectedIndex === null || !dialog || dialog.open) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => dialog.showModal(), reduceMotion ? 0 : 680);
    return () => window.clearTimeout(timer);
  }, [selectedIndex]);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => window.speechSynthesis?.cancel();
  }, []);

  return (
    <section className="tarot-room mx-auto max-w-2xl" aria-labelledby="tarot-title">
      <div className="tarot-heading">
        <button type="button" className="tarot-back" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Volver al muro
        </button>
        <h1 id="tarot-title" className="font-editorial"><MoonStar aria-hidden="true" /> Tarot del día</h1>
        <p>Toca las tres cartas para descubrir tu lectura simbólica de hoy.</p>
      </div>
      <div className="tarot-table" data-revealing={revealed.length > 0}>
        <img className="tarot-reader" src={reader} alt="El lector de tarot detrás de su mesa de cartas"
          width={928} height={1152} fetchPriority="high" />
        <img className="tarot-reader tarot-reader-hands" src={readerHands} alt=""
          width={928} height={1152} decoding="async" aria-hidden="true" />
        {revealed.length > 0 && (
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
              <button key={card.name} type="button" className="tarot-card"
                aria-label={isRevealed ? `${positions[index]}: ${card.name}. ${card.reading}` : `Revelar carta: ${positions[index]}`}
                onClick={() => openCard(index)}>
                <span className="tarot-card-flip" data-revealed={isRevealed} aria-hidden="true">
                  <span className="tarot-card-face tarot-card-back"><Sparkles /><span>Destino</span></span>
                  <span className="tarot-card-face tarot-card-front">
                    {isRevealed && <img src={getArtwork(card)} alt="" />}
                  </span>
                </span>
                <span className="tarot-position" aria-hidden="true">{isRevealed ? card.name : positions[index]}</span>
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
        onClose={() => { window.speechSynthesis?.cancel(); setAudioMessage(''); setSelectedIndex(null); }}
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        {activeCard && selectedIndex !== null && (
          <div className="tarot-detail-content">
            <button type="button" className="tarot-detail-close" aria-label="Cerrar carta"
              onClick={() => detailRef.current?.close()}><X aria-hidden="true" size={23} /></button>
            <img className="tarot-detail-art" src={getArtwork(activeCard)} alt={`Ilustración de ${activeCard.name}`} />
            <div className="tarot-detail-text">
              <p>{positions[selectedIndex]}</p>
              <h2 className="font-editorial">{activeCard.name}</h2>
              <p>{activeCard.reading}</p>
              <p><strong>Consejo del lector:</strong> {activeCard.action}</p>
              <button type="button" className="tarot-listen" onClick={() => readCard(selectedIndex)}>
                <Volume2 size={18} aria-hidden="true" /> Escuchar
              </button>
              {audioMessage && <p role="status">{audioMessage}</p>}
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
