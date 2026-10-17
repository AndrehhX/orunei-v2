/**
 * Configuración oficial de temas de Orunei:
 * - Claro (light)
 * - Oscuro (dark)
 * - Sakura (sakura 🌸)
 */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SAKURA: 'sakura',
};

/**
 * Paleta de colores oficial del Tema Sakura
 */
export const SAKURA_PALETTE = {
  softBlush: '#FFE5EC',
  pastelPink: '#FFC2D1',
  cherryBlossom: '#FFB3C6',
  cottonCandy: '#FF8FAB',
  petalRouge: '#FB6F92',
};

/**
 * Obtiene el siguiente tema en el ciclo de alternancia
 */
export function getNextTheme(currentTheme) {
  if (currentTheme === THEMES.DARK) return THEMES.SAKURA;
  if (currentTheme === THEMES.SAKURA) return THEMES.LIGHT;
  return THEMES.DARK;
}
