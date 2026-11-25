import React, { useMemo, useState } from 'react';
import { ArrowLeft, MoonStar, Sparkles } from 'lucide-react';
import classicCards from './cartas-clasicas.webp';
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
                aria-disabled={isRevealed}
                onClick={() => setRevealed((current) => current.includes(index) ? current : [...current, index])}>
                <span className="tarot-card-flip" data-revealed={isRevealed} aria-hidden="true">
                  <span className="tarot-card-face tarot-card-back"><Sparkles /><span>Destino</span></span>
                  <span className="tarot-card-face tarot-card-front"
                    style={{ backgroundImage: `url(${classicCards})`, backgroundSize: `${deck.length * 100}% 100%`,
                      backgroundPosition: `${card.artwork * 100 / (deck.length - 1)}% center` }} />
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
      <p className="px-4 pb-3 pt-2 text-center text-xs text-[#f1d9a8]">
        Ilustraciones de Pamela Colman Smith · Rider–Waite–Smith
      </p>
    </section>
  );
}
