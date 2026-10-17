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
      container: 'bg-gradient-to-r from-[#FFB3C6]/15 via-[#FB6F92]/15 to-[#FFB3C6]/10 hover:from-[#FFB3C6]/25 hover:to-[#FB6F92]/25 border border-[#FB6F92]/40 hover:border-[#FB6F92]/70 text-[#FB6F92] dark:text-[#FFB3C6] shadow-xs hover:shadow-sm hover:shadow-[#FB6F92]/30',
      pill: 'bg-gradient-to-r from-[#FB6F92] to-[#FF8FAB] text-white shadow-xs',
      icon: '☕',
      dot: 'bg-[#FB6F92]',
      ping: 'bg-[#FFB3C6]',
    };
  }

  if (theme === 'dark') {
    return {
      theme: 'dark',
      container: 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/70 text-amber-300 shadow-xs hover:shadow-sm hover:shadow-amber-500/30',
      pill: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-xs',
      icon: '☕',
      dot: 'bg-amber-400',
      ping: 'bg-amber-300',
    };
  }

  // Light theme por defecto
  return {
    theme: 'light',
    container: 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/60 text-amber-800 shadow-xs hover:shadow-sm hover:shadow-amber-500/20',
    pill: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs',
    icon: '☕',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
  };
}
