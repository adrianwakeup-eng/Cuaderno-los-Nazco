export interface FamilyStickerItem {
  id: string;
  kind: 'GIF' | 'STICKER';
  category: 'AMOR' | 'CELEBRACION' | 'SALUDOS' | 'HOGAR';
  label: string;
  emoji: string;
  subEmoji?: string;
  gradient: string;
  animationClass: string;
}

export const FAMILY_GIFS: FamilyStickerItem[] = [
  {
    id: 'gif_mucho_amor',
    kind: 'GIF',
    category: 'AMOR',
    label: '¡Te quiero mucho!',
    emoji: '💖',
    subEmoji: '✨💕',
    gradient: 'from-rose-400 via-pink-500 to-orange-400',
    animationClass: 'animate-heartbeat',
  },
  {
    id: 'gif_abrazo_gigante',
    kind: 'GIF',
    category: 'AMOR',
    label: '¡Abrazo gigante!',
    emoji: '🤗',
    subEmoji: '💛🌟',
    gradient: 'from-amber-400 via-orange-400 to-rose-400',
    animationClass: 'animate-wiggle',
  },
  {
    id: 'gif_feliz_cumple',
    kind: 'GIF',
    category: 'CELEBRACION',
    label: '¡Feliz Cumpleaños!',
    emoji: '🎂',
    subEmoji: '🎉🎈',
    gradient: 'from-pink-500 via-amber-400 to-yellow-400',
    animationClass: 'animate-bounce',
  },
  {
    id: 'gif_cafecito',
    kind: 'GIF',
    category: 'HOGAR',
    label: '¡Hora del cafecito!',
    emoji: '☕️',
    subEmoji: '🥐💛',
    gradient: 'from-amber-500 via-orange-500 to-amber-700',
    animationClass: 'animate-float-gentle',
  },
  {
    id: 'gif_buenos_dias',
    kind: 'GIF',
    category: 'SALUDOS',
    label: '¡Buenos días Familia!',
    emoji: '🌞',
    subEmoji: '🌈🌼',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    animationClass: 'animate-sway',
  },
  {
    id: 'gif_mil_besos',
    kind: 'GIF',
    category: 'AMOR',
    label: '¡Mil besos!',
    emoji: '😘',
    subEmoji: '💋❤️',
    gradient: 'from-rose-500 via-red-400 to-pink-400',
    animationClass: 'animate-heartbeat',
  },
  {
    id: 'gif_a_celebrar',
    kind: 'GIF',
    category: 'CELEBRACION',
    label: '¡A celebrar juntos!',
    emoji: '🎉',
    subEmoji: '🥂✨',
    gradient: 'from-fuchsia-500 via-rose-500 to-amber-400',
    animationClass: 'animate-wiggle',
  },
  {
    id: 'gif_dulces_suenos',
    kind: 'GIF',
    category: 'SALUDOS',
    label: '¡Dulces sueños!',
    emoji: '🌙',
    subEmoji: '⭐️💤',
    gradient: 'from-indigo-500 via-purple-500 to-pink-400',
    animationClass: 'animate-float-gentle',
  },
  {
    id: 'gif_hola_nazco',
    kind: 'GIF',
    category: 'SALUDOS',
    label: '¡Hola Los Nazco!',
    emoji: '👋',
    subEmoji: '😄💛',
    gradient: 'from-emerald-400 via-teal-500 to-amber-400',
    animationClass: 'animate-sway',
  },
  {
    id: 'gif_que_risa',
    kind: 'GIF',
    category: 'CELEBRACION',
    label: '¡Jajaja qué risa!',
    emoji: '😂',
    subEmoji: '✨🤣',
    gradient: 'from-yellow-400 via-orange-400 to-pink-400',
    animationClass: 'animate-bounce',
  },
  {
    id: 'gif_musica_casa',
    kind: 'GIF',
    category: 'HOGAR',
    label: '¡Música y alegría!',
    emoji: '🎶',
    subEmoji: '🎸💃',
    gradient: 'from-orange-400 via-rose-500 to-purple-500',
    animationClass: 'animate-wiggle',
  },
  {
    id: 'gif_flores_carino',
    kind: 'GIF',
    category: 'AMOR',
    label: 'Flores con cariño',
    emoji: '💐',
    subEmoji: '🌸🦋',
    gradient: 'from-pink-400 via-rose-400 to-emerald-400',
    animationClass: 'animate-sway',
  },
  {
    id: 'gif_hogar_dulce',
    kind: 'GIF',
    category: 'HOGAR',
    label: 'Hogar dulce hogar',
    emoji: '🏡',
    subEmoji: '❤️🌻',
    gradient: 'from-amber-400 via-terracotta-500 to-emerald-500',
    animationClass: 'animate-float-gentle',
  },
  {
    id: 'gif_bendiciones',
    kind: 'GIF',
    category: 'AMOR',
    label: '¡Muchas bendiciones!',
    emoji: '🙏',
    subEmoji: '✨🕊️',
    gradient: 'from-amber-300 via-orange-400 to-rose-400',
    animationClass: 'animate-heartbeat',
  },
  {
    id: 'gif_orgullo',
    kind: 'GIF',
    category: 'CELEBRACION',
    label: '¡Qué orgullo!',
    emoji: '👏',
    subEmoji: '🌟🏆',
    gradient: 'from-emerald-500 via-teal-400 to-amber-400',
    animationClass: 'animate-bounce',
  },
  {
    id: 'gif_llamemonos',
    kind: 'GIF',
    category: 'SALUDOS',
    label: '¡Llamémonos pronto!',
    emoji: '📹',
    subEmoji: '📞💕',
    gradient: 'from-emerald-500 via-olive-600 to-teal-500',
    animationClass: 'animate-wiggle',
  },
];

export const FAMILY_STICKERS: FamilyStickerItem[] = [
  { id: 'stk_corazon_familia', kind: 'STICKER', category: 'AMOR', label: 'Familia Nazco', emoji: '❤️‍🔥', gradient: 'from-rose-100 to-orange-100', animationClass: '' },
  { id: 'stk_te_extrano', kind: 'STICKER', category: 'AMOR', label: 'Te extraño', emoji: '🥹', gradient: 'from-pink-100 to-rose-100', animationClass: '' },
  { id: 'stk_amor_eterno', kind: 'STICKER', category: 'AMOR', label: 'Con amor', emoji: '🥰', gradient: 'from-rose-100 to-amber-100', animationClass: '' },
  { id: 'stk_abrazote', kind: 'STICKER', category: 'AMOR', label: 'Abrazote', emoji: '🫂', gradient: 'from-amber-100 to-orange-100', animationClass: '' },
  { id: 'stk_girasol', kind: 'STICKER', category: 'SALUDOS', label: '¡Buen día!', emoji: '🌻', gradient: 'from-yellow-100 to-amber-100', animationClass: '' },
  { id: 'stk_arcoiris', kind: 'STICKER', category: 'SALUDOS', label: '¡Ánimo!', emoji: '🌈', gradient: 'from-sky-100 to-pink-100', animationClass: '' },
  { id: 'stk_buenas_noches', kind: 'STICKER', category: 'SALUDOS', label: 'Descansa', emoji: '🌟', gradient: 'from-indigo-100 to-purple-100', animationClass: '' },
  { id: 'stk_sonrisa', kind: 'STICKER', category: 'SALUDOS', label: '¡Feliz!', emoji: '😄', gradient: 'from-amber-100 to-yellow-100', animationClass: '' },
  { id: 'stk_paella', kind: 'STICKER', category: 'HOGAR', label: '¡Qué rico!', emoji: '🥘', gradient: 'from-orange-100 to-amber-100', animationClass: '' },
  { id: 'stk_pastel', kind: 'STICKER', category: 'CELEBRACION', label: '¡Pastel!', emoji: '🧁', gradient: 'from-pink-100 to-amber-100', animationClass: '' },
  { id: 'stk_cafe', kind: 'STICKER', category: 'HOGAR', label: 'Cafecito', emoji: '☕️', gradient: 'from-amber-100 to-orange-100', animationClass: '' },
  { id: 'stk_guitarra', kind: 'STICKER', category: 'HOGAR', label: 'Serenata', emoji: '🎸', gradient: 'from-rose-100 to-purple-100', animationClass: '' },
  { id: 'stk_brindis', kind: 'STICKER', category: 'CELEBRACION', label: '¡Salud!', emoji: '🥂', gradient: 'from-yellow-100 to-orange-100', animationClass: '' },
  { id: 'stk_estrella', kind: 'STICKER', category: 'CELEBRACION', label: '¡Genial!', emoji: '🤩', gradient: 'from-amber-100 to-pink-100', animationClass: '' },
  { id: 'stk_aplausos', kind: 'STICKER', category: 'CELEBRACION', label: '¡Bravo!', emoji: '👏', gradient: 'from-emerald-100 to-teal-100', animationClass: '' },
  { id: 'stk_globos', kind: 'STICKER', category: 'CELEBRACION', label: '¡Fiesta!', emoji: '🎈', gradient: 'from-rose-100 to-sky-100', animationClass: '' },
];

export const ALL_STICKERS_AND_GIFS: FamilyStickerItem[] = [...FAMILY_GIFS, ...FAMILY_STICKERS];

export function findStickerOrGif(id?: string): FamilyStickerItem | undefined {
  if (!id) return undefined;
  return ALL_STICKERS_AND_GIFS.find((item) => item.id === id);
}
