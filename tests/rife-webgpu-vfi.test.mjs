/**
 * rife-webgpu-vfi.test.mjs
 * 
 * Suite de pruebas automatizadas para el banco de pruebas RIFE + WebGPU Frame Generation
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  RIFE_SETTINGS,
  INTERPOLATION_TARGETS,
  checkWebGPUSupport,
  quantizeToMultipleOf16,
  calculateFrameDifference,
  generateAlphaBlendFrame,
} from '../experiments/rife-vfi/rifeEngine.js';

test('1. checkWebGPUSupport retorna diagnóstico seguro sin lanzar excepciones en Node.js', async () => {
  const result = await checkWebGPUSupport();
  assert.equal(typeof result.supported, 'boolean');
  assert.equal(typeof result.hasF16, 'boolean');
  assert.equal(typeof result.reason, 'string');
});

test('2. INTERPOLATION_TARGETS define cadencias 24→48 FPS y 30→60 FPS con intervalos exactos', () => {
  const t48 = INTERPOLATION_TARGETS['48fps'];
  assert.ok(t48);
  assert.equal(t48.baseFps, 24);
  assert.equal(t48.targetFps, 48);
  assert.ok(Math.abs(t48.frameIntervalMs - 20.833) < 0.01);

  const t60 = INTERPOLATION_TARGETS['60fps'];
  assert.ok(t60);
  assert.equal(t60.baseFps, 30);
  assert.equal(t60.targetFps, 60);
  assert.ok(Math.abs(t60.frameIntervalMs - 16.666) < 0.01);
});

test('3. quantizeToMultipleOf16 ajusta las dimensiones a múltiplos exactos de 16 para los shaders RIFE', () => {
  assert.deepEqual(quantizeToMultipleOf16(640, 360), { w: 640, h: 352 });
  assert.deepEqual(quantizeToMultipleOf16(1920, 1080), { w: 1920, h: 1072 });
  assert.deepEqual(quantizeToMultipleOf16(1280, 720), { w: 1280, h: 720 });
});

test('4. calculateFrameDifference mide la diferencia media absoluta (MAD) normalizada', () => {
  const frameA = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
  const frameB = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]);
  assert.equal(calculateFrameDifference(frameA, frameB, 1), 0.0);

  const black = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]);
  const white = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]);
  assert.equal(calculateFrameDifference(black, white, 1), 1.0);
});

test('5. Detección de cortes de escena (Scene Cut): umbral > 0.35 detecta cambios de plano bruscos', () => {
  const shotA = new Uint8Array(400).fill(20);  // Escena oscura
  const shotB = new Uint8Array(400).fill(230); // Escena clara (corte de plano)
  const diff = calculateFrameDifference(shotA, shotB, 1);
  assert.ok(diff > RIFE_SETTINGS.SCENE_CUT_THRESHOLD, `Diferencia ${diff} debe superar umbral de corte`);
});

test('6. Detección de cuadros duplicados en anime (animación en 2s): evita inferencia innecesaria', () => {
  const frame1 = new Uint8Array(400).fill(120);
  const frame2 = new Uint8Array(400).fill(121); // Variación mínima por compresión
  const diff = calculateFrameDifference(frame1, frame2, 1);
  assert.ok(diff < RIFE_SETTINGS.DUPLICATE_THRESHOLD, `Diferencia ${diff} debe ser menor al umbral de duplicado`);
});

test('7. generateAlphaBlendFrame realiza mezcla lineal 50/50 demostrando efecto de doble visión', () => {
  const imgA = new Uint8Array([200, 100, 50, 255]);
  const imgB = new Uint8Array([100, 200, 150, 255]);
  const blended = generateAlphaBlendFrame(imgA, imgB, 0.5);

  assert.equal(blended[0], 150); // (200 + 100) / 2
  assert.equal(blended[1], 150); // (100 + 200) / 2
  assert.equal(blended[2], 100); // (50 + 150) / 2
  assert.equal(blended[3], 255);
});

test('8. Integridad de los pesos neuronales RIFE (rt_v7s.json y rt_v7s.bin)', () => {
  const jsonPath = path.resolve('public/weights/rife/rt_v7s.json');
  const binPath = path.resolve('public/weights/rife/rt_v7s.bin');

  assert.ok(fs.existsSync(jsonPath), 'El archivo rt_v7s.json debe existir');
  assert.ok(fs.existsSync(binPath), 'El archivo rt_v7s.bin debe existir');

  const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  assert.ok(manifest['block0.conv0.0.0.weight'], 'Debe contener la convolución inicial block0');
  assert.deepEqual(manifest['block0.conv0.0.0.weight'].shape, [48, 6, 3, 3]);
  assert.ok(manifest['block0.lastconv.weight'], 'Debe contener la convolución de flujo óptico y máscara');

  const statBin = fs.statSync(binPath);
  assert.ok(statBin.size > 2_500_000, 'El archivo binario debe tener el tamaño completo (~2.9 MB)');
});

test('9. Requisitos de licencias: el documento LEGAL_AND_LICENSING.md existe y documenta restricciones', () => {
  const legalPath = path.resolve('experiments/rife-vfi/LEGAL_AND_LICENSING.md');
  assert.ok(fs.existsSync(legalPath), 'Debe existir LEGAL_AND_LICENSING.md');
  const content = fs.readFileSync(legalPath, 'utf-8');
  assert.ok(content.includes('MIT License'), 'Debe especificar la licencia MIT del runtime');
  assert.ok(content.includes('Non-Commercial'), 'Debe advertir de la restricción no comercial de los pesos');
  assert.ok(content.includes('Knowledge Distillation'), 'Debe analizar las implicaciones del modelo profesor');
});
