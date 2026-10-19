/**
 * Gestor de velocidad de reproducción persistente en Orunei.
 * Permite recordar la velocidad preferida del usuario (ej. 1.25x o 1.5x)
 * a través de todos los episodios y animes sin saturar la pantalla.
 */

export const SUPPORTED_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_SPEED = 1;
export const STORAGE_KEY = 'orunei_playback_speed';

function getLocalStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Obtiene la velocidad preferida almacenada en localStorage.
 * Si no existe o es inválida, retorna 1.
 */
export function getStoredPlaybackSpeed() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SPEED;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SPEED;
    const num = parseFloat(raw);
    if (isNaN(num) || !SUPPORTED_SPEEDS.includes(num)) {
      return DEFAULT_SPEED;
    }
    return num;
  } catch {
    return DEFAULT_SPEED;
  }
}

/**
 * Guarda la velocidad preferida en localStorage.
 */
export function setStoredPlaybackSpeed(speed) {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SPEED;
  const num = typeof speed === 'number' ? speed : parseFloat(speed);
  const targetSpeed = SUPPORTED_SPEEDS.includes(num) ? num : DEFAULT_SPEED;
  try {
    storage.setItem(STORAGE_KEY, String(targetSpeed));
  } catch {}
  return targetSpeed;
}

/**
 * Aplica de forma segura la velocidad de reproducción a un elemento HTMLVideoElement.
 */
export function applyPlaybackSpeed(videoElement, speed) {
  if (!videoElement) return;
  try {
    const num = typeof speed === 'number' && !isNaN(speed) ? speed : DEFAULT_SPEED;
    videoElement.playbackRate = num;
  } catch (err) {
    console.warn('[playbackSpeed] Error aplicando playbackRate:', err);
  }
}
