import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSyncAction,
  createPartySessionId,
  SYNC_THRESHOLDS,
  OruneiPartyClient
} from '../src/party/partyClient.js';

test('party-sync: SYNC_THRESHOLDS se ajusta a los requerimientos de sincronización inteligente', () => {
  assert.equal(SYNC_THRESHOLDS.IGNORE_MS, 250, 'El umbral de tolerancia mínima debe ser 250 ms');
  assert.equal(SYNC_THRESHOLDS.GRADUAL_CORRECTION_MS, 1000, 'El umbral de corrección gradual debe ser 1000 ms');
});

test('party-sync: genera IDs de sala válidos y seguros', () => {
  const id1 = createPartySessionId();
  const id2 = createPartySessionId();

  assert.ok(typeof id1 === 'string', 'El ID debe ser string');
  assert.equal(id1.length, 6, 'El ID de sala debe tener 6 caracteres');
  assert.notEqual(id1, id2, 'Dos llamadas sucesivas deben generar IDs diferentes');
  assert.match(id1, /^[a-z0-9]+$/, 'El ID solo debe contener caracteres alfanuméricos en minúsculas');
});

test('party-sync: desfase inferior a 250 ms no interviene (NONE)', () => {
  // 100 ms de diferencia mientras reproduce
  const actionAhead = calculateSyncAction(10.1, 10.0, false);
  assert.equal(actionAhead.type, 'NONE', 'No debe intervenir si la diferencia es de 100ms');

  const actionBehind = calculateSyncAction(9.9, 10.0, false);
  assert.equal(actionBehind.type, 'NONE', 'No debe intervenir si la diferencia es de -100ms');

  // Exacto
  const actionExact = calculateSyncAction(15.0, 15.0, false);
  assert.equal(actionExact.type, 'NONE');
});

test('party-sync: desfase entre 250 ms y 1000 ms activa corrección gradual de velocidad (SPEED_ADJUST)', () => {
  // Cliente atrasado 500ms (anfitrión va en 10.5, cliente en 10.0) -> debe acelerar a 1.08x
  const actionBehind = calculateSyncAction(10.0, 10.5, false);
  assert.equal(actionBehind.type, 'SPEED_ADJUST');
  assert.equal(actionBehind.rate, 1.08, 'Debe acelerar ligeramente para alcanzar al anfitrión');
  assert.equal(actionBehind.diffMs, 500);

  // Cliente adelantado 600ms (anfitrión va en 10.0, cliente en 10.6) -> debe desacelerar a 0.92x
  const actionAhead = calculateSyncAction(10.6, 10.0, false);
  assert.equal(actionAhead.type, 'SPEED_ADJUST');
  assert.equal(actionAhead.rate, 0.92, 'Debe desacelerar ligeramente para esperar al anfitrión');
  assert.equal(actionAhead.diffMs, -600);
});

test('party-sync: desfase mayor a 1000 ms ejecuta salto directo (SEEK)', () => {
  // Desfase de 3 segundos
  const actionFar = calculateSyncAction(10.0, 13.0, false);
  assert.equal(actionFar.type, 'SEEK');
  assert.equal(actionFar.targetTime, 13.0);

  // Desfase de -5 segundos
  const actionAheadFar = calculateSyncAction(20.0, 15.0, false);
  assert.equal(actionAheadFar.type, 'SEEK');
  assert.equal(actionAheadFar.targetTime, 15.0);
});

test('party-sync: comportamiento cuando el reproductor está pausado', () => {
  // Pausado con menos de 300ms de diferencia -> no busca
  const pausedSynced = calculateSyncAction(10.1, 10.0, true);
  assert.equal(pausedSynced.type, 'NONE');

  // Pausado con más de 300ms de diferencia -> alinea exactamente
  const pausedDesynced = calculateSyncAction(5.0, 10.0, true);
  assert.equal(pausedDesynced.type, 'SEEK');
  assert.equal(pausedDesynced.targetTime, 10.0);
});

test('party-sync: OruneiPartyClient inicializa estado autoritativo y emite eventos', () => {
  const user = { id: 'user-123', email: 'test@orunei.com', user_metadata: { username: 'OtakuTester' } };
  const client = new OruneiPartyClient('room-xyz', user, {
    isHost: true,
    animeId: '25777',
    animeTitle: 'Shingeki no Kyojin',
    episode: 2,
    roomName: 'Maratón Shingeki',
  });

  assert.equal(client.roomId, 'room-xyz');
  assert.equal(client.isHost, true);
  assert.equal(client.currentRoomState.episode, 2);
  assert.equal(client.currentRoomState.animeTitle, 'Shingeki no Kyojin');

  let stateReceived = null;
  const unsubscribe = client.on('state', (state) => {
    stateReceived = state;
  });

  client.emit('state', { isPlaying: true, currentTime: 42 });
  assert.ok(stateReceived, 'Debe recibir el estado emitido');
  assert.equal(stateReceived.currentTime, 42);

  unsubscribe();
});
