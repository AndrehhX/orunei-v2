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

test('dubSeasonManager: identifica títulos doblados con MyDubList', () => {
  // MAL 16498 (Attack on Titan) y MAL 25777 (Attack on Titan S2) deben tener doblaje
  assert.equal(isMalIdDubbedInSpanish(16498), true);
  assert.equal(isMalIdDubbedInSpanish(25777), true);

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
