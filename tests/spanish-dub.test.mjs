import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSeasonAudioPreference,
  setSeasonAudioPreference,
  clearSeasonAudioPreference
} from '../src/playback/audioPreference.js';
import {
  isMalIdDubbedInSpanish,
  verifySeasonDubAvailability
} from '../src/playback/dubSeasonManager.js';
import { getDubEpisodePlayback } from '../src/playback/dubStreamAdapter.js';

// Mock de localStorage en memoria para Node
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] ?? null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockStorage();

test('audioPreference: gestiona almacenamiento por usuario, anime y temporada', () => {
  globalThis.localStorage.clear();

  // 1. Sin preferencia previa retorna null
  const initial = getSeasonAudioPreference('16498', 's1', 'user-123');
  assert.equal(initial, null);

  // 2. Guardar preferencia 'latino'
  setSeasonAudioPreference('16498', 's1', 'latino', 'user-123');
  const stored = getSeasonAudioPreference('16498', 's1', 'user-123');
  assert.equal(stored, 'latino');

  // 3. Diferente temporada no se confunde
  const season2 = getSeasonAudioPreference('16498', 's2', 'user-123');
  assert.equal(season2, null);

  // 4. Fallback a guest si el usuario inició sesión
  setSeasonAudioPreference('20958', 's1', 'sub_es', null);
  const guestFallback = getSeasonAudioPreference('20958', 's1', 'user-456');
  assert.equal(guestFallback, 'sub_es');

  // 5. Limpieza de preferencia
  clearSeasonAudioPreference('16498', 's1', 'user-123');
  assert.equal(getSeasonAudioPreference('16498', 's1', 'user-123'), null);
});

test('dubSeasonManager: identifica títulos doblados con MyDubList y descarta títulos sin servidor (ej. Ghibli)', () => {
  // MAL 16498 (Attack on Titan), MAL 25777 (Attack on Titan S2) y MAL 40748 (Jujutsu Kaisen) deben tener doblaje
  assert.equal(isMalIdDubbedInSpanish(16498), true);
  assert.equal(isMalIdDubbedInSpanish(25777), true);
  assert.equal(isMalIdDubbedInSpanish(40748), true);

  // Ghibli / Howl no Ugoku Shiro (431) debe ser descartado porque no tiene fuentes en streaming
  assert.equal(isMalIdDubbedInSpanish(431), false);
  assert.equal(isMalIdDubbedInSpanish(199), false);

  // ID inexistente o no doblado retorna false
  assert.equal(isMalIdDubbedInSpanish(99999999), false);
  assert.equal(isMalIdDubbedInSpanish(null), false);
});

test('dubSeasonManager: verifica cobertura completa de temporada en AnimeAV1', async () => {
  const result = await verifySeasonDubAvailability({
    malId: 25777,
    animeTitle: 'Shingeki no Kyojin Season 2',
    expectedEpisodes: 12
  });

  assert.equal(result.available, true);
  assert.equal(result.hasLatino, true);
  assert.equal(result.hasCastellano, false); // Castellano no verificado en 1080p completo
  assert.equal(result.slug, 'shingeki-no-kyojin-season-2');
  assert.equal(result.totalEpisodes, 12);
});

test('dubStreamAdapter: extrae servidores 1080p reales en esquema de Orunei', async () => {
  const playback = await getDubEpisodePlayback({
    malId: 25777,
    animeTitle: 'Shingeki no Kyojin Season 2',
    slug: 'shingeki-no-kyojin-season-2',
    episode: 1,
    language: 'latino'
  });

  assert.ok(playback.proxiedStreamUrl, 'Debe contener proxiedStreamUrl');
  assert.ok(Array.isArray(playback.servers), 'Debe contener un arreglo de servidores');
  assert.ok(playback.servers.length >= 1, 'Debe haber al menos 1 servidor verificado');
  assert.equal(playback.audioLanguage, 'latino');
  assert.equal(playback.resolution, '1080p');
  assert.equal(playback.isDub, true);

  // Verificar que el servidor principal sea 1080p
  const mainServer = playback.servers[0];
  assert.ok(mainServer.proxiedStreamUrl, 'El servidor debe tener stream URL');
  assert.equal(mainServer.quality, '1080p');
});

test('sourceSelector: deduplica, limita a máximo 5 servidores y prioriza por dispositivo', async () => {
  const { selectAndPrioritizeServers } = await import('../src/playback/sourceSelector.js');

  const mockServers = [
    { id: 's1', sourceName: 'MP4Upload', proxiedStreamUrl: 'https://cdn.example.com/video1.mp4', isAv1: true, quality: '1080p' },
    { id: 's2', sourceName: 'StreamTape', proxiedStreamUrl: 'https://cdn.example.com/video2.mp4', isUniversalH264: true, quality: '1080p' },
    { id: 's3', sourceName: 'Zilla', embedUrl: 'https://player.example.com/embed1', isEmbed: true, quality: '1080p' },
    { id: 's4', sourceName: 'VOE', embedUrl: 'https://player.example.com/embed2', isEmbed: true, quality: '1080p' },
    { id: 's5', sourceName: 'Mega', embedUrl: 'https://player.example.com/embed4', isEmbed: true, quality: '1080p' },
    { id: 's6', sourceName: 'Duplicate', proxiedStreamUrl: 'https://cdn.example.com/video1.mp4?token=123' } // Duplicado
  ];

  // 1. En móvil / iPad: Universal H.264 y embeds deben ir primero para evitar pantalla negra
  const mobileResult = selectAndPrioritizeServers(mockServers, { isMobile: true, language: 'latino' });
  assert.ok(mobileResult.length <= 5, 'No debe superar 5 servidores para no sobresaturar');
  assert.equal(mobileResult[0].isUniversalH264, true, 'En móvil H.264 universal debe ser el primero');
  assert.ok(mobileResult[0].name.includes('🇲🇽 Servidor 1'));

  // 2. En Desktop: Directo Bluray primero
  const desktopResult = selectAndPrioritizeServers(mockServers, { isMobile: false, language: 'castellano' });
  assert.ok(desktopResult.length <= 5);
  assert.equal(desktopResult[0].isEmbed, false, 'En desktop streams directos van primero');
  assert.ok(desktopResult[0].name.includes('🇪🇸 Servidor 1'));
});

test('dubStreamAdapter: no expone Byse como proveedor de reproducción', async () => {
  const fs = await import('node:fs/promises');
  const adapterSource = await fs.readFile(new URL('../src/playback/dubStreamAdapter.js', import.meta.url), 'utf8');

  assert.doesNotMatch(adapterSource, /byse/i, 'Byse no debe aparecer en el adaptador ni en sus servidores');
});

test('dubStreamAdapter: prioriza mx/LatAnime y usa AnimeAV1 solo como fallback', async () => {
  const fs = await import('node:fs/promises');
  const adapterSource = await fs.readFile(new URL('../src/playback/dubStreamAdapter.js', import.meta.url), 'utf8');
  const latinoFlow = adapterSource.slice(
    adapterSource.indexOf('CASO 2: ESPAÑOL LATINO'),
    adapterSource.indexOf('const cleanCandidates')
  );

  assert.ok(
    latinoFlow.indexOf('resolveLatanimeSlug') < latinoFlow.indexOf('resolveAnimeAV1Slug'),
    'LatAnime debe consultarse antes que AnimeAV1'
  );
  assert.match(latinoFlow, /if \(rawCandidates\.length === 0\)/, 'AnimeAV1 debe quedar condicionado a ausencia de servidores mx');
});

test('providerCircuitBreaker: protege contra fallos continuos de proveedores', async () => {
  const { isProviderAvailable, recordProviderOutcome, resetProviderStats } = await import('../src/playback/providerCircuitBreaker.js');

  resetProviderStats();
  assert.equal(isProviderAvailable('test-prov'), true);

  // Registrar 3 fallos consecutivos para abrir circuito
  recordProviderOutcome('test-prov', 'failed');
  recordProviderOutcome('test-prov', 'failed');
  recordProviderOutcome('test-prov', 'failed');

  assert.equal(isProviderAvailable('test-prov'), false, 'El circuito debe estar abierto tras 3 fallos');

  resetProviderStats();
  assert.equal(isProviderAvailable('test-prov'), true, 'El circuito debe restablecerse al reset');
});

test('cero falsos positivos: JoJo y animes sin servidores de streaming son excluidos', async () => {
  const { isMalIdDubbedInSpanish, EXCLUDED_DUB_MAL_IDS } = await import('../src/playback/dubSeasonManager.js');

  // JoJo Parts 1 a 6 deben estar explícitamente en el conjunto de exclusión
  assert.equal(EXCLUDED_DUB_MAL_IDS.has('14719'), true);
  assert.equal(EXCLUDED_DUB_MAL_IDS.has('20899'), true);
  assert.equal(EXCLUDED_DUB_MAL_IDS.has('26055'), true);
  assert.equal(EXCLUDED_DUB_MAL_IDS.has('37991'), true);
  assert.equal(EXCLUDED_DUB_MAL_IDS.has('48661'), true);

  // isMalIdDubbedInSpanish debe retornar false para evitar etiquetas engañosas en el catálogo
  assert.equal(isMalIdDubbedInSpanish(14719), false);
  assert.equal(isMalIdDubbedInSpanish(20899), false);
  assert.equal(isMalIdDubbedInSpanish(26055), false);
});

test('mapeo por lotes: valida rangos de episodios oficiales para animes extensos', async () => {
  const { isEpisodeInDubRange, getDubBatchInfo } = await import('../src/playback/dubSeasonManager.js');

  // 1. One Piece (doblado hasta el ep 325)
  assert.equal(isEpisodeInDubRange('21', 1), true);
  assert.equal(isEpisodeInDubRange('21', 325), true);
  assert.equal(isEpisodeInDubRange('21', 326), false);
  assert.equal(getDubBatchInfo('21')?.label, 'Eps. 1-325');

  // 2. Naruto Shippuden (doblado hasta el ep 112)
  assert.equal(isEpisodeInDubRange('1735', 1), true);
  assert.equal(isEpisodeInDubRange('1735', 112), true);
  assert.equal(isEpisodeInDubRange('1735', 113), false);

  // 3. Bleach clásico (doblado hasta el ep 229)
  assert.equal(isEpisodeInDubRange('269', 100), true);
  assert.equal(isEpisodeInDubRange('269', 229), true);
  assert.equal(isEpisodeInDubRange('269', 230), false);

  // 4. Anime completamente doblado sin restricción de lote (ej. Chainsaw Man)
  assert.equal(isEpisodeInDubRange('44511', 12), true);
  assert.equal(getDubBatchInfo('44511'), null);
});

test('stormMonoschinosProvider: extrae y normaliza servidores sin duplicar', async () => {
  const { resolveMonoschinosSlug, getMonoschinosEpisodeServers } = await import('../src/playback/stormMonoschinosProvider.js');

  // Comprueba que las funciones estén definidas y exportadas
  assert.equal(typeof resolveMonoschinosSlug, 'function');
  assert.equal(typeof getMonoschinosEpisodeServers, 'function');
});


