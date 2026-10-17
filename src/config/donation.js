/**
 * Configuración oficial de donaciones de Orunei.
 * Modifica este enlace con tu URL oficial de Ko-fi (Kofy) cuando esté disponible.
 */
export const KOFI_DONATION_URL = 'https://ko-fi.com';

export const KOFI_TIERS = [
  {
    id: '1-coffee',
    coffees: 1,
    amount: '$3',
    label: '1 Café',
    description: 'Un empujón para recargar energías y mantener el servidor al día.',
  },
  {
    id: '2-coffees',
    coffees: 2,
    amount: '$6',
    label: '2 Cafés',
    description: '¡Doble café para acelerar el streaming 1080p y evitar saturaciones!',
    popular: true,
  },
  {
    id: '3-coffees',
    coffees: 3,
    amount: '$9',
    label: '3 Cafés',
    description: 'Aporte legendario para indexar más doblajes y financiar ancho de banda.',
  },
  {
    id: 'custom',
    coffees: null,
    amount: 'Libre',
    label: 'Aporte libre',
    description: 'Tú eliges con todo cariño el monto para respaldar el proyecto.',
  },
];
