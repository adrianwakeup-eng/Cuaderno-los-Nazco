const separator = ' · ';

export function formatMemberLocation(province: string, country: string): string {
  const parts = [province.trim(), country.trim()];
  return parts.some(Boolean) ? parts.join(separator).trim() : '';
}

export function parseMemberLocation(location: string): { province: string; country: string } {
  const [province, country] = location.split('·').map((part) => part.trim());
  if (country !== undefined) return { province, country };
  const parts = location.split(',').map((part) => part.trim());
  return parts.length > 1
    ? { province: parts.slice(0, -1).join(', '), country: parts.at(-1) ?? '' }
    : { province: '', country: location.trim() };
}

export const hasUpdatedLocation = (location: string): boolean =>
  location.includes('·') && Boolean(parseMemberLocation(location).country);

export const normalizeRegion = (name: string): string =>
  name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const provinceCoordinates: Record<string, Record<string, [number, number]>> = {
  cuba: {
    'pinar del rio': [22.42, -83.70], artemisa: [22.81, -82.76],
    'la habana': [23.11, -82.36], habana: [23.11, -82.36],
    mayabeque: [22.89, -82.11], matanzas: [22.98, -81.44],
    cienfuegos: [22.15, -80.44], 'villa clara': [22.49, -79.94],
    'sancti spiritus': [22.00, -79.44], 'ciego de avila': [21.85, -78.76],
    camaguey: [21.40, -77.92], 'las tunas': [20.96, -76.95],
    holguin: [20.88, -76.26], granma: [20.37, -76.65],
    'santiago de cuba': [20.06, -75.92], guantanamo: [20.15, -75.06],
    'isla de la juventud': [21.70, -82.85],
  },
  brasil: {
    acre: [-9.02, -70.81], alagoas: [-9.57, -36.78], amapa: [1.45, -51.94],
    amazonas: [-4.13, -64.46], bahia: [-12.48, -41.78], ceara: [-5.20, -39.53],
    'distrito federal': [-15.78, -47.80], 'espirito santo': [-19.58, -40.67],
    goias: [-15.91, -49.10], maranhao: [-5.17, -45.28], 'mato grosso': [-12.64, -55.42],
    'mato grosso do sul': [-20.77, -54.79], 'minas gerais': [-18.59, -44.51],
    para: [-4.36, -52.78], paraiba: [-7.15, -36.77], parana: [-24.70, -51.60],
    pernambuco: [-8.35, -37.86], piaui: [-7.70, -42.73], 'rio de janeiro': [-22.13, -42.76],
    'rio grande do norte': [-5.75, -36.55], 'rio grande do sul': [-29.73, -53.19],
    rondonia: [-11.22, -62.80], roraima: [2.19, -61.37], 'santa catarina': [-27.26, -50.49],
    'sao paulo': [-22.27, -48.70], sergipe: [-10.57, -37.43], tocantins: [-10.18, -48.35],
  },
};
