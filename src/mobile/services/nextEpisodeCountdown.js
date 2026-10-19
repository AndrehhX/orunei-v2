/**
 * Lógica para la cuenta regresiva automática de "Siguiente Episodio en 5s..." (Estilo Netflix)
 * Activa un overlay flotante sutil en los últimos 15 segundos o al terminar el video,
 * permitiendo avanzar al siguiente capítulo automáticamente o cancelar si se desean ver los créditos.
 */

export const TRIGGER_THRESHOLD_SECONDS = 15;
export const COUNTDOWN_DURATION = 5;

/**
 * Evalúa si debe mostrarse la cuenta regresiva de siguiente episodio.
 */
export function shouldTriggerCountdown({
  currentTime,
  duration,
  episode,
  totalEpisodes,
  isDismissed = false,
}) {
  if (isDismissed) return false;
  if (typeof currentTime !== 'number' || typeof duration !== 'number' || isNaN(currentTime) || isNaN(duration)) {
    return false;
  }
  // Video muy corto o duración inválida
  if (duration < 30) return false;

  // Si no hay siguiente episodio disponible
  if (totalEpisodes && episode >= totalEpisodes) {
    return false;
  }

  // Activa en los últimos 15 segundos
  const secondsRemaining = duration - currentTime;
  return secondsRemaining <= TRIGGER_THRESHOLD_SECONDS;
}
