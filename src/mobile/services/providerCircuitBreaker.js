/**
 * Circuit Breaker y Monitor de Salud de Proveedores de Transmisión
 * Inspirado en la arquitectura de StreamPlay (providerStats).
 *
 * Previene tiempos de espera prolongados y degradación de la interfaz
 * cuando un proveedor o servidor experimenta interrupciones o bloqueos WAF.
 */

const FAIL_THRESHOLD = 3; // Fallos consecutivos para disparar el disyuntor
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos de tiempo de enfriamiento

const stats = new Map();

function blankStat() {
  return {
    successCount: 0,
    failureCount: 0,
    emptyCount: 0,
    consecutiveFailures: 0,
    circuitOpenUntil: 0,
    lastOutcome: null,
    lastAt: 0,
  };
}

function getStat(providerId) {
  let s = stats.get(providerId);
  if (!s) {
    s = blankStat();
    stats.set(providerId, s);
  }
  return s;
}

/**
 * Registra el resultado de una solicitud a un proveedor:
 * - 'found': exitoso, produjo fuentes válidas. Cierra el disyuntor.
 * - 'empty': accesible pero el título no está en este catálogo (no es un fallo de salud).
 * - 'failed': timeout, error 5xx o bloqueo de red. Incrementa el contador de fallos.
 */
export function recordProviderOutcome(providerId, outcome, durationMs = 0) {
  if (!providerId) return;
  const s = getStat(providerId);
  s.lastOutcome = outcome;
  s.lastAt = Date.now();

  if (outcome === 'found') {
    s.successCount++;
    s.consecutiveFailures = 0;
    s.circuitOpenUntil = 0; // Recuperado -> disyuntor cerrado
  } else if (outcome === 'failed') {
    s.failureCount++;
    s.consecutiveFailures++;
    if (s.consecutiveFailures >= FAIL_THRESHOLD) {
      s.circuitOpenUntil = Date.now() + COOLDOWN_MS;
      console.warn(`[providerCircuitBreaker] Disyuntor activado para "${providerId}" por ${COOLDOWN_MS / 1000}s`);
    }
  } else {
    // 'empty' = reachable, just no content for this query
    s.emptyCount++;
    s.consecutiveFailures = 0;
  }
}

/**
 * Determina si el proveedor debe ejecutarse o ser omitido por enfriamiento.
 * Permite una sonda de prueba (half-open probe) cuando concluye el enfriamiento.
 */
export function isProviderAvailable(providerId) {
  if (!providerId) return true;
  const s = stats.get(providerId);
  if (!s || !s.circuitOpenUntil) return true;

  if (Date.now() < s.circuitOpenUntil) {
    return false; // Disyuntor abierto: omitir llamada para evitar latencia
  }

  // Fin del cooldown: permitir una sonda de prueba (half-open probe)
  s.circuitOpenUntil = Date.now() + COOLDOWN_MS;
  return true;
}

/**
 * Reinicia las estadísticas de un proveedor o de todos.
 */
export function resetProviderStats(providerId = null) {
  if (providerId) {
    stats.delete(providerId);
  } else {
    stats.clear();
  }
}
