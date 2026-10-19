import { Capacitor } from '@capacitor/core';

/**
 * Retorna true exclusivamente cuando la aplicación se ejecuta dentro del contenedor nativo de Android (APK / Capacitor).
 * Soporta detección temprana ante demoras de inyección de Capacitor.
 */
export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  if (typeof Capacitor !== 'undefined' && Boolean(Capacitor.isNativePlatform())) return true;
  if (typeof window.Capacitor !== 'undefined' && Boolean(window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return true;
  if (window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost') return true;
  if (/Capacitor|Android.*Version\/[\d.]+/i.test(navigator.userAgent)) return true;
  return false;
}
