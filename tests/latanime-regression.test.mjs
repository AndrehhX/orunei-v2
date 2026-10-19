import test from 'node:test';
import assert from 'node:assert/strict';

test('Latanime no confunde títulos parecidos al resolver doblaje', async () => {
  const { resolveLatanimeSlug } = await import('../src/playback/soraDubProvider.js');

  assert.equal(await resolveLatanimeSlug('regression-monster', 'Monster', 'latino'), 'monster-latino');
  assert.equal(await resolveLatanimeSlug('regression-another', 'Another', 'latino'), 'another-latino');
});

test('Latanime entrega servidores cuando se consulta desde el dominio de producción', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      hostname: 'www.orunei.sbs',
      origin: 'https://www.orunei.sbs'
    }
  };

  try {
    const { resolveLatanimeSlug, getLatanimeEpisodeServers } = await import('../src/playback/soraDubProvider.js');
    const slug = await resolveLatanimeSlug('regression-production', 'Monster', 'latino');
    assert.equal(slug, 'monster-latino');

    const servers = await getLatanimeEpisodeServers(slug, 1, 'latino');
    assert.ok(servers.length > 0, 'El proveedor mx debe devolver al menos un servidor para el episodio');
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('El adaptador usa mx como principal cuando su episodio es reproducible', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: {
      hostname: 'www.orunei.sbs',
      origin: 'https://www.orunei.sbs'
    }
  };

  try {
    const { getDubEpisodePlayback } = await import('../src/playback/dubStreamAdapter.js');
    const playback = await getDubEpisodePlayback({
      malId: 19,
      animeTitle: 'Monster',
      episode: 1,
      language: 'latino'
    });

    assert.match(playback.servers[0].id, /^sora-/, 'El primer servidor debe pertenecer a mx/LatAnime');
    assert.ok(playback.proxiedStreamUrl, 'mx debe entregar una URL reproducible');

    const streamProbe = await fetch(playback.proxiedStreamUrl, { headers: { Range: 'bytes=0-1023' } });
    assert.equal(streamProbe.status, 206, 'La URL principal debe responder con un rango de video');
    assert.match(streamProbe.headers.get('content-type') || '', /video\//i);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

