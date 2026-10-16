import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isWebGL2Supported,
  ANIME_ENHANCE_SETTINGS,
  ANIME_ENHANCE_MODES,
  computeAnimeEnhanceSample,
  createAnimeEnhanceEngine,
  getLuma,
} from '../src/playback/animeEnhanceEngine.js';

test('isWebGL2Supported retorna booleano seguro sin lanzar excepciones', () => {
  assert.equal(typeof isWebGL2Supported(), 'boolean');
});

test('ANIME_ENHANCE_MODES contiene los tres modos requeridos: Normal, Equilibrado y Alta Definición', () => {
  assert.equal(ANIME_ENHANCE_MODES.length, 3);
  const [off, balanced, high] = ANIME_ENHANCE_MODES;
  assert.equal(off.id, 'off');
  assert.equal(off.label, 'Normal');
  assert.equal(balanced.id, 'balanced');
  assert.equal(balanced.label, 'Equilibrado');
  assert.equal(high.id, 'high');
  assert.equal(high.label, 'Alta Definición');

  // Parámetros moderados que evitan sobreprocesamiento
  assert.ok(balanced.sharpness <= 0.50);
  assert.ok(balanced.lineDarken <= 0.30);
  assert.ok(high.sharpness <= 0.80);
});

test('1. Prueba Anime 720p: aclara y define contornos borrosos sin halos', () => {
  // Simulación de trazo en video 720p estirado:
  // Fondo claro de animación (0.85), contorno borroso degradado (0.50) y núcleo oscuro (0.20)
  const bg = [0.85, 0.85, 0.85];
  const blurryEdge = [0.50, 0.50, 0.50];
  const darkCore = [0.20, 0.20, 0.20];

  const resultBalanced = computeAnimeEnhanceSample({
    c: blurryEdge,
    tl: bg, tc: bg, tr: bg,
    ml: darkCore, mr: bg,
    bl: bg, bc: bg, br: bg,
    sharpness: 0.40,
    lineDarken: 0.22,
    lineThin: 0.18,
  });

  // El borde borroso debe afilarse moderadamente hacia el núcleo
  assert.ok(resultBalanced[0] < blurryEdge[0], 'El borde debe ganar nitidez');
  // Garantía Anti-ringing estricta: nunca sobrepasa los extremos del vecindario
  assert.ok(resultBalanced[0] >= darkCore[0], 'No debe perforar el mínimo local');
  assert.ok(resultBalanced[0] <= bg[0], 'No debe superar el fondo');
});

test('2. Prueba Anime 1080p: preserva líneas ya nítidas sin sobre-enfocar ni deformar', () => {
  // En 1080p nativo el trazo ya está bien definido
  const bg = [0.90, 0.90, 0.90];
  const sharpLine = [0.12, 0.12, 0.12];

  const result = computeAnimeEnhanceSample({
    c: sharpLine,
    tl: bg, tc: bg, tr: bg,
    ml: sharpLine, mr: sharpLine,
    bl: sharpLine, bc: sharpLine, br: sharpLine,
    sharpness: 0.40,
    lineDarken: 0.22,
    lineThin: 0.18,
  });

  // El núcleo de la línea no debe sufrir saltos bruscos ni artefactos
  assert.ok(Math.abs(result[0] - sharpLine[0]) < 0.05, 'Debe preservar el trazo original limpio');
});

test('3. Prueba Líneas finas y cabello: no borra detalles delgados de 1px', () => {
  // Pelo fino o pestaña de 1 píxel: rodeado por ambos lados de fondo claro
  const bg = [0.88, 0.88, 0.88];
  const thinHair = [0.25, 0.25, 0.25];

  const result = computeAnimeEnhanceSample({
    c: thinHair,
    tl: bg, tc: bg, tr: bg,
    ml: bg, mr: bg,
    bl: bg, bc: bg, br: bg,
    sharpness: 0.40,
    lineDarken: 0.22,
    lineThin: 0.18,
  });

  // La línea fina debe mantenerse intacta o ligeramente reforzada, NUNCA borrada hacia el fondo
  assert.ok(result[0] <= thinHair[0] + 0.01, 'No debe desvanecer el cabello');
  assert.ok(result[0] >= thinHair[0] * 0.70, 'No debe aplastar excesivamente el trazo');
});

test('4. Prueba Fondos planos y degradados: cero ruido, grano o banding artificial', () => {
  // Cielo azul plano
  const sky = [0.40, 0.70, 0.95];
  const resultFlat = computeAnimeEnhanceSample({
    c: sky,
    tl: sky, tc: sky, tr: sky,
    ml: sky, mr: sky,
    bl: sky, bc: sky, br: sky,
    sharpness: 0.70,
    lineDarken: 0.38,
    lineThin: 0.30,
  });

  assert.deepEqual(resultFlat, sky, 'En superficies planas el resultado debe ser numéricamente idéntico');

  // Degradado suave (sunset)
  const gradA = [0.80, 0.50, 0.30];
  const gradB = [0.81, 0.50, 0.30];
  const resultGrad = computeAnimeEnhanceSample({
    c: gradA,
    tl: gradA, tc: gradB, tr: gradB,
    ml: gradA, mr: gradB,
    bl: gradA, bc: gradB, br: gradB,
    sharpness: 0.40,
    lineDarken: 0.22,
    lineThin: 0.18,
  });

  assert.ok(Math.abs(resultGrad[0] - gradA[0]) < 0.02, 'No debe generar bandas en degradados');
});

test('5. Prueba Texto y subtítulos en pantalla: conserva legibilidad y no añade ringing', () => {
  // Texto blanco de subtítulo (1.0) con borde negro (0.0)
  const whiteText = [1.0, 1.0, 1.0];
  const blackBorder = [0.0, 0.0, 0.0];

  const result = computeAnimeEnhanceSample({
    c: whiteText,
    tl: whiteText, tc: whiteText, tr: whiteText,
    ml: blackBorder, mr: whiteText,
    bl: whiteText, bc: whiteText, br: whiteText,
    sharpness: 0.70,
  });

  // Anti-ringing estricto: el blanco no debe sobrepasar 1.0 ni generar halos
  assert.equal(result[0], 1.0);
  assert.equal(result[1], 1.0);
  assert.equal(result[2], 1.0);
});

test('6. Prueba Escenas oscuras: no aplasta los negros (no black crush)', () => {
  // Detalle en sombras de anime (luminancia baja 0.04)
  const shadow = [0.04, 0.04, 0.05];
  const darkCore = [0.02, 0.02, 0.03];

  const result = computeAnimeEnhanceSample({
    c: shadow,
    tl: shadow, tc: shadow, tr: shadow,
    ml: darkCore, mr: shadow,
    bl: shadow, bc: shadow, br: shadow,
    sharpness: 0.70,
    lineDarken: 0.38,
    lineThin: 0.30,
  });

  // Gracias a smoothstep(0.02, 0.15, l_c), el darkening se atenúa en sombras para conservar información
  assert.ok(result[0] > 0.015, 'No debe aplastar el detalle en sombras a negro puro');
});

test('7. Prueba Movimiento rápido: procesamiento espacial sin rastro ni ghosting temporal', () => {
  // En Anime Enhance cada fotograma es procesado independientemente en GPU (cero alpha-blending ni buffers de movimiento)
  const colA = [0.10, 0.20, 0.30];
  const colB = [0.90, 0.80, 0.70];

  const frame1 = computeAnimeEnhanceSample({ c: colA, tl: colA, tc: colA, tr: colA, ml: colA, mr: colA, bl: colA, bc: colA, br: colA });
  const frame2 = computeAnimeEnhanceSample({ c: colB, tl: colB, tc: colB, tr: colB, ml: colB, mr: colB, bl: colB, bc: colB, br: colB });

  // No hay persistencia de frame1 en frame2
  assert.deepEqual(frame1, colA);
  assert.deepEqual(frame2, colB);
});

test('8. Comparación visual A/B: el modo split y bypass retorna los píxeles originales intactos', () => {
  const sample = [0.45, 0.55, 0.65];
  const neighbor = [0.10, 0.10, 0.10];

  // Lado izquierdo del split (A/B original)
  const originalSide = computeAnimeEnhanceSample({
    c: sample,
    tl: neighbor, tc: neighbor, tr: neighbor,
    ml: neighbor, mr: neighbor,
    bl: neighbor, bc: neighbor, br: neighbor,
    isSplitLeft: true,
  });

  assert.deepEqual(originalSide, sample, 'El lado A (original) debe entregar la imagen sin alterar');
});

test('9. Ciclo de vida y prevención de fugas de memoria en WebGL2', () => {
  let textureDeleted = false;
  let bufferDeleted = false;
  let programDeleted = false;
  let contextLost = false;

  const mockGl = {
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    deleteShader: () => {},
    useProgram: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texParameteri: () => {},
    texImage2D: () => {},
    getUniformLocation: () => ({}),
    uniform1i: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    activeTexture: () => {},
    drawArrays: () => {},
    viewport: () => {},
    deleteTexture: () => { textureDeleted = true; },
    deleteBuffer: () => { bufferDeleted = true; },
    deleteProgram: () => { programDeleted = true; },
    getExtension: () => ({ loseContext: () => { contextLost = true; } }),
  };

  const fakeCanvas = {
    id: '',
    className: '',
    style: {},
    getContext: () => mockGl,
    parentNode: { removeChild: () => {} },
  };

  globalThis.document = {
    createElement: () => fakeCanvas,
    hidden: false,
  };
  globalThis.window = { devicePixelRatio: 1.5 };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};

  const fakeContainer = {
    querySelector: () => null,
    insertBefore: () => {},
    appendChild: () => {},
    clientWidth: 1280,
    clientHeight: 720,
  };
  const fakeVideo = { clientWidth: 1280, clientHeight: 720, readyState: 4, paused: false, ended: false };

  const engine = createAnimeEnhanceEngine({
    video: fakeVideo,
    container: fakeContainer,
  });

  assert.ok(engine !== null);

  // Comprobar cambio de modo en caliente
  engine.setMode('high');
  const cfg = engine.getCurrentConfig();
  assert.equal(cfg.sharpness, 0.70);

  // Destruir y verificar liberación absoluta de recursos
  engine.destroy();
  assert.equal(textureDeleted, true, 'Debe liberar textura de video');
  assert.equal(bufferDeleted, true, 'Debe liberar buffer quad');
  assert.equal(programDeleted, true, 'Debe liberar programa shader');
  assert.equal(contextLost, true, 'Debe liberar contexto WebGL2');

  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});
