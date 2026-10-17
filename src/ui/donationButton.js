/**
 * Estilos adaptativos para el botón de donaciones Ko-fi según el tema activo:
 * - Claro (light)
 * - Oscuro (dark)
 * - Sakura (sakura 🌸)
 */

export function getDonationThemeStyles(theme = 'dark') {
  if (theme === 'sakura') {
    return {
      theme: 'sakura',
      container: 'bg-gradient-to-r from-[#FFB3C6]/30 via-[#FB6F92]/25 to-[#FF8FAB]/30 hover:from-[#FFB3C6]/45 hover:to-[#FB6F92]/40 border border-[#FB6F92]/60 text-[#a02447] shadow-sm shadow-[#FB6F92]/25 hover:shadow-md hover:shadow-[#FB6F92]/40',
      pill: 'bg-gradient-to-r from-[#FB6F92] to-[#FF8FAB] text-white shadow-xs',
      icon: '☕',
    };
  }

  if (theme === 'dark') {
    return {
      theme: 'dark',
      container: 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 hover:border-amber-400 text-amber-300 shadow-sm shadow-amber-500/25 hover:shadow-md hover:shadow-amber-500/40',
      pill: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-xs',
      icon: '☕',
    };
  }

  // Light theme por defecto
  return {
    theme: 'light',
    container: 'bg-gradient-to-r from-amber-500/15 via-orange-400/20 to-amber-500/15 hover:from-amber-500/25 hover:to-orange-400/30 border border-amber-500/50 hover:border-amber-600 text-amber-800 shadow-sm shadow-amber-500/20 hover:shadow-md hover:shadow-amber-500/30',
    pill: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs',
    icon: '☕',
  };
}
