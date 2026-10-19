/**
 * Selector Inteligente de Fuentes y Anti-Sobresaturación
 * Inspirado en la selección adaptativa y ponderación de fuentes de StreamPlay.
 *
 * Evita la sobresaturación de servidores, filtra duplicados,
 * asegura un límite óptimo (3-5 servidores verificados) y
 * prioriza automáticamente según el dispositivo (iPad/móvil vs PC).
 */

const MAX_SERVERS_PER_EPISODE = 5;

/**
 * Normaliza y deduplica una lista de servidores candidatos.
 */
export function selectAndPrioritizeServers(rawServers = [], { isMobile = false, language = 'latino' } = {}) {
  if (!Array.isArray(rawServers) || rawServers.length === 0) {
    return [];
  }

  const seenUrls = new Set();
  const seenHosts = new Set();
  const cleanList = [];

  for (const srv of rawServers) {
    if (!srv || (!srv.proxiedStreamUrl && !srv.embedUrl)) continue;

    const streamUrl = srv.proxiedStreamUrl || srv.embedUrl;
    // Extraer base URL para deduplicación
    const cleanUrl = streamUrl.split('?')[0].toLowerCase();

    if (seenUrls.has(cleanUrl)) continue;
    seenUrls.add(cleanUrl);

    // Evitar saturar con más de 1 servidor del mismo host idéntico
    const hostKey = (srv.sourceName || srv.provider || srv.id || '').toLowerCase();
    if (hostKey && seenHosts.has(hostKey) && cleanList.length >= 3) {
      continue;
    }
    if (hostKey) seenHosts.add(hostKey);

    cleanList.push(srv);
  }

  // Ordenamiento inteligente según dispositivo:
  let sorted = [];
  const flag = language === 'castellano' ? '🇪🇸' : '🇲🇽';
  const langLabel = language === 'castellano' ? 'Castellano' : 'Latino';

  if (isMobile) {
    // 1) En móviles / iPads: 8-bit H.264 directo universal primero, luego embeds funcionales, luego streams de 10 bits
    const universalH264 = cleanList.filter((s) => s.isUniversalH264 && !s.isEmbed);
    const embeds = cleanList.filter((s) => s.isEmbed);
    const otherDirect = cleanList.filter((s) => !s.isUniversalH264 && !s.isEmbed);

    sorted = [...universalH264, ...embeds, ...otherDirect];
  } else {
    // 2) En PC: streams directos 1080p de máxima fidelidad (Bluray / AV1) primero, luego embeds
    const direct1080p = cleanList.filter((s) => !s.isEmbed);
    const embeds = cleanList.filter((s) => s.isEmbed);

    sorted = [...direct1080p, ...embeds];
  }

  // Limitar al número óptimo para no sobresaturar la interfaz
  const limited = sorted.slice(0, MAX_SERVERS_PER_EPISODE);

  // Renumerar y asignar nombres limpios y profesionales
  return limited.map((srv, idx) => {
    let cleanDetail = '';
    if (srv.isUniversalH264) {
      cleanDetail = isMobile ? '1080p Universal iPad/Móvil' : '1080p Universal H.264';
    } else if (srv.isAv1) {
      cleanDetail = isMobile ? '1080p AV1 (PC/M4)' : '1080p Bluray';
    } else if (srv.isEmbed) {
      cleanDetail = srv.sourceName ? `Player ${srv.sourceName}` : 'Player HD';
    } else {
      cleanDetail = srv.quality || '1080p';
    }

    return {
      ...srv,
      isEmbed: Boolean(srv.isEmbed),
      name: `${flag} Servidor ${idx + 1} (${langLabel} ${cleanDetail})`
    };
  });
}
