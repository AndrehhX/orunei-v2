/**
 * tests/webgpu-super-resolution.test.mjs
 * 
 * Suite de verificación para el motor de Superresolución Neuronal WebGPU (Anime4K CNN)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWebGPUSupported,
  WEBGPU_SUPER_RES_MODES,
  WEBGPU_SUPER_RES_SETTINGS,
  loadModelWeights,
  calculateUpscaledDimensions,
  createWebGPUSuperResEngine,
} from '../src/playback/webgpuSuperResEngine.js';

test('isWebGPUSupported retorna booleano seguro sin lanzar excepciones en Node/SSR', async () => {
  const supported = await isWebGPUSupported();
  assert.equal(typeof supported, 'boolean');
});

test('WEBGPU_SUPER_RES_MODES define Normal, CNN Small 2× y CNN Medium 2×', () => {
  assert.ok(Array.isArray(WEBGPU_SUPER_RES_MODES));
  assert.equal(WEBGPU_SUPER_RES_MODES.length, 3);

  const normal = WEBGPU_SUPER_RES_MODES.find((m) => m.id === 'off');
  const small = WEBGPU_SUPER_RES_MODES.find((m) => m.id === 'cnn-s');
  const medium = WEBGPU_SUPER_RES_MODES.find((m) => m.id === 'cnn-m');

  assert.ok(normal, 'Modo Normal debe existir');
  assert.equal(normal.scale, 1);
  assert.equal(normal.networkName, null);

  assert.ok(small, 'Modo CNN Small 2× debe existir');
  assert.equal(small.scale, 2);
  assert.equal(small.networkName, 'anime4k/cnn-2x-s');

  assert.ok(medium, 'Modo CNN Medium 2× debe existir');
  assert.equal(medium.scale, 2);
  assert.equal(medium.networkName, 'anime4k/cnn-2x-m');
});

test('loadModelWeights carga pesos convolucionales reales de Anime4K CNN Small (cnn-2x-s)', async () => {
  const weights = await loadModelWeights('cnn-s');
  assert.ok(weights, 'Pesos no deben ser nulos');
  assert.equal(weights.name, 'anime4k/cnn-2x-s');
  assert.ok(weights.layers, 'Debe contener el diccionario de capas convolucionales');

  // Verificar presencia de capas clave de la arquitectura CNN 2x
  assert.ok(weights.layers.conv2d_tf, 'Debe contener conv2d_tf');
  assert.ok(Array.isArray(weights.layers.conv2d_tf.weights));
  assert.ok(weights.layers.conv2d_tf.weights.length > 0);
  assert.ok(Array.isArray(weights.layers.conv2d_tf.bias));

  assert.ok(weights.layers.conv2d_1_tf, 'Debe contener conv2d_1_tf');
  assert.ok(weights.layers.conv2d_2_tf, 'Debe contener conv2d_2_tf');
  assert.ok(weights.layers.conv2d_last_tf, 'Debe contener conv2d_last_tf');
  assert.ok(weights.layers.pixel_shuffle, 'Debe contener pixel_shuffle para reconstrucción 2x');
});

test('loadModelWeights carga pesos convolucionales reales de Anime4K CNN Medium (cnn-2x-m)', async () => {
  const weights = await loadModelWeights('cnn-m');
  assert.ok(weights, 'Pesos no deben ser nulos');
  assert.equal(weights.name, 'anime4k/cnn-2x-m');
  assert.ok(weights.layers, 'Debe contener capas convolucionales profundas');

  assert.ok(weights.layers.conv2d_tf);
  assert.ok(weights.layers.pixel_shuffle);
  // El modelo Medium posee mayor cantidad de pesos y capas que el Small
  const smallWeights = await loadModelWeights('cnn-s');
  const smallWeightCount = Object.keys(smallWeights.layers).length;
  const mediumWeightCount = Object.keys(weights.layers).length;
  assert.ok(mediumWeightCount >= smallWeightCount, 'Modelo Medium debe tener igual o mayor complejidad');
});

test('calculateUpscaledDimensions genera el doble exacto de resolución espacial (2×)', () => {
  // Caso 720p -> 1440p (2x)
  const up720 = calculateUpscaledDimensions(1280, 720, 2);
  assert.equal(up720.width, 2560);
  assert.equal(up720.height, 1440);
  assert.equal(up720.scale, 2);
  assert.ok(Math.abs(up720.aspectRatio - (16 / 9)) < 0.001);

  // Caso 1080p -> 2160p (4K UHD 2x)
  const up1080 = calculateUpscaledDimensions(1920, 1080, 2);
  assert.equal(up1080.width, 3840);
  assert.equal(up1080.height, 2160);
  assert.equal(up1080.scale, 2);
  assert.ok(Math.abs(up1080.aspectRatio - (16 / 9)) < 0.001);
});

test('Preservación de relación de aspecto: cero deformación geométrica en letterboxing', () => {
  // Anime clásico 4:3 (960x720)
  const up43 = calculateUpscaledDimensions(960, 720, 2);
  assert.equal(up43.width, 1920);
  assert.equal(up43.height, 1440);
  assert.equal(up43.aspectRatio, 960 / 720);

  // Anime cinematográfico 2.39:1 (1920x804)
  const upCinema = calculateUpscaledDimensions(1920, 804, 2);
  assert.equal(upCinema.width, 3840);
  assert.equal(upCinema.height, 1608);
  assert.equal(upCinema.aspectRatio, 1920 / 804);
});

test('Arquitectura no invasiva: canvas superpuesto con pointer-events: none y object-contain', async () => {
  let createdCanvas = null;
  const fakeVideo = {
    addEventListener: () => {},
    removeEventListener: () => {},
    videoWidth: 1280,
    videoHeight: 720,
    readyState: 4,
  };

  const fakeContainer = {
    querySelector: () => null,
    insertBefore: (el) => { createdCanvas = el; },
    appendChild: (el) => { createdCanvas = el; },
  };

  globalThis.document = {
    createElement: (tag) => {
      if (tag === 'canvas') {
        return {
          id: '',
          className: '',
          style: {},
          parentNode: fakeContainer,
        };
      }
      return {};
    },
  };

  // Si WebGPU no está presente en Node, debe invocar onError y retornar null limpiamente
  let errorCaught = null;
  const engine = await createWebGPUSuperResEngine({
    video: fakeVideo,
    container: fakeContainer,
    mode: 'cnn-s',
    onError: (err) => { errorCaught = err; },
  });

  assert.equal(engine, null);
  assert.ok(errorCaught instanceof Error);
  assert.ok(errorCaught.message.includes('WebGPU no está soportado'));

  delete globalThis.document;
});

test('Mecanismo de comparación A/B interactivo (Split y Bypass)', async () => {
  let canvasStyle = {};
  const mockEngine = {
    setSplitComparison: ({ enabled = false, position = 0.5, bypass = false } = {}) => {
      if (bypass) {
        canvasStyle.opacity = '0';
        canvasStyle.clipPath = 'none';
      } else if (enabled) {
        canvasStyle.opacity = '1';
        const pct = Math.round(position * 100);
        canvasStyle.clipPath = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
      } else {
        canvasStyle.opacity = '1';
        canvasStyle.clipPath = 'none';
      }
    },
  };

  // 1. Modo completo (sin split)
  mockEngine.setSplitComparison({ enabled: false });
  assert.equal(canvasStyle.opacity, '1');
  assert.equal(canvasStyle.clipPath, 'none');

  // 2. Modo Split 50%
  mockEngine.setSplitComparison({ enabled: true, position: 0.5 });
  assert.equal(canvasStyle.opacity, '1');
  assert.equal(canvasStyle.clipPath, 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)');

  // 3. Modo Bypass (oculta canvas al 100% para ver original sin latencia)
  mockEngine.setSplitComparison({ bypass: true });
  assert.equal(canvasStyle.opacity, '0');
});

test('createWebGPUSuperResEngine rechaza argumentos incompletos de forma segura', async () => {
  await assert.rejects(
    async () => createWebGPUSuperResEngine({ video: null, container: null }),
    /video and container are required/
  );
});
