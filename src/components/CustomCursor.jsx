import { useEffect } from 'react';

/**
 * Mantenemos el cursor nativo del sistema para máxima fluidez, latencia cero (144Hz+)
 * y una experiencia de navegación natural y humana sin artefactos artificiales.
 */
export default function CustomCursor() {
  useEffect(() => {
    document.documentElement.classList.remove('has-custom-cursor', 'cursor-away');
  }, []);

  return null;
}
