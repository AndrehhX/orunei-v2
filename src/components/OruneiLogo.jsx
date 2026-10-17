import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Logotipo oficial de Orunei:
 * Ícono limpio Sparkles con color de marca y tipografía nítida y moderna.
 */
export default function OruneiLogo({
  size = 26,
  withText = true,
  className = '',
  textClassName = 'text-2xl font-extrabold tracking-tight',
}) {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <Sparkles className="text-brand shrink-0" size={size} />
      {withText && (
        <span className={`text-slate-900 dark:text-white font-extrabold tracking-tight ${textClassName}`}>
          Orunei
        </span>
      )}
    </div>
  );
}
