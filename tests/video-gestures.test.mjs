import test from 'node:test';
import assert from 'node:assert/strict';
import { isPiPSupported, togglePiP } from '../src/playback/useVideoGestures.js';

test('isPiPSupported retorna false de forma segura si no está disponible en el entorno', () => {
  // En node no existe document por defecto
  assert.equal(isPiPSupported(), false);
});

test('togglePiP maneja elementos nulos sin lanzar excepciones', async () => {
  const result = await togglePiP(null);
  assert.equal(result, false);
});

test('togglePiP invoca requestPictureInPicture cuando está habilitado en document', async () => {
  let requested = false;
  globalThis.document = {
    pictureInPictureEnabled: true,
    pictureInPictureElement: null,
  };
  const fakeVideo = {
    requestPictureInPicture: async () => {
      requested = true;
      return {};
    },
  };

  const ok = await togglePiP(fakeVideo);
  assert.equal(ok, true);
  assert.equal(requested, true);

  // Limpiar mock
  delete globalThis.document;
});

test('togglePiP conmuta modo picture-in-picture nativo de WebKit en iOS Safari', async () => {
  let presentationMode = 'inline';
  const fakeIosVideo = {
    webkitSupportsPresentationMode: (mode) => mode === 'picture-in-picture',
    get webkitPresentationMode() { return presentationMode; },
    webkitSetPresentationMode: (mode) => { presentationMode = mode; },
  };

  assert.equal(isPiPSupported(fakeIosVideo), true);

  // Activar PiP en iOS
  const entered = await togglePiP(fakeIosVideo);
  assert.equal(entered, true);
  assert.equal(presentationMode, 'picture-in-picture');

  // Desactivar PiP en iOS
  const exited = await togglePiP(fakeIosVideo);
  assert.equal(exited, false);
  assert.equal(presentationMode, 'inline');
});
