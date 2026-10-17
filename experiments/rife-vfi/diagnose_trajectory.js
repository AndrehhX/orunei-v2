// Diagnóstico forense de la trayectoria de presentación del planificador RIFE 60 FPS
import { INPUT_CADENCES, UNIVERSAL_TARGET_FPS, OUTPUT_FRAME_INTERVAL_MS } from './rifeEngine.js';

function simulateScheduler(cadenceKey = '30fps', numFrames = 10) {
  const cadence = INPUT_CADENCES[cadenceKey];
  const inputIntervalMs = cadence.frameIntervalMs;
  const targetIntervalMs = OUTPUT_FRAME_INTERVAL_MS; // 16.6667 ms

  let mediaTimeMs = 0;
  let frameA_timeMs = 0;
  let frameB_timeMs = inputIntervalMs;
  let framePairIndex = 0;

  // Estado del host (CPU)
  let hostFrameA = { index: 0, timeMs: 0, xPos: 0 };
  let hostFrameB = { index: 1, timeMs: inputIntervalMs, xPos: 100 };

  // Estado de la GPU (VRAM)
  let gpuTexA = { index: 0, xPos: 0 }; // Inicialización
  let gpuTexB = { index: 1, xPos: 100 };
  let gpuOutTex = null;

  const timeline = [];

  for (let tick = 0; tick < numFrames; tick++) {
    const presentTimeMs = tick * targetIntervalMs;

    // Avanzar par de cuadros si mediaTimeMs sobrepasa frameB_timeMs
    while (mediaTimeMs >= frameB_timeMs) {
      framePairIndex++;
      frameA_timeMs = frameB_timeMs;
      frameB_timeMs = frameA_timeMs + inputIntervalMs;
      hostFrameA = { ...hostFrameB };
      hostFrameB = {
        index: framePairIndex + 1,
        timeMs: frameB_timeMs,
        xPos: (framePairIndex + 1) * 100,
      };
    }

    const span = frameB_timeMs - frameA_timeMs;
    const t = Math.max(0.0, Math.min(1.0, (mediaTimeMs - frameA_timeMs) / span));

    let presentedSource = '';
    let presentedXPos = null;
    let anomaly = '';

    if (t <= 0.05) {
      // Instante de ancla original A: llama a rife.presentFrame('original') -> bindGroupTexA
      // Pero como no hubo dispatchInterpolation, gpuTexA NO SE ACTUALIZÓ con hostFrameA!
      presentedSource = `texA (VRAM frame ${gpuTexA.index})`;
      presentedXPos = gpuTexA.xPos;
    } else if (t >= 0.95) {
      presentedSource = `texB (VRAM frame ${gpuTexB.index})`;
      presentedXPos = gpuTexB.xPos;
    } else {
      // 0.05 < t < 0.95: Inferencia RIFE
      // dispatchInterpolation sube hostFrameA a texA y hostFrameB a texB
      gpuTexA = { ...hostFrameA };
      gpuTexB = { ...hostFrameB };
      // RIFE interpola la posición entre gpuTexA y gpuTexB con factor t
      const interpolatedX = gpuTexA.xPos + t * (gpuTexB.xPos - gpuTexA.xPos);
      gpuOutTex = { xPos: interpolatedX };
      presentedSource = `RIFE(t=${t.toFixed(2)}) -> outTex`;
      presentedXPos = gpuOutTex.xPos;
    }

    if (timeline.length > 0) {
      const prev = timeline[timeline.length - 1];
      const deltaX = presentedXPos - prev.presentedXPos;
      if (deltaX < 0) {
        anomaly = `⚠️ RETROCESO: ${prev.presentedXPos} -> ${presentedXPos} (Δx = ${deltaX})`;
      } else if (deltaX === 0) {
        anomaly = `⏸️ REPETIDO: ${presentedXPos} (Δx = 0)`;
      } else {
        anomaly = `✅ Avance +${deltaX.toFixed(1)} px`;
      }
    }

    timeline.push({
      tick,
      presentTimeMs: presentTimeMs.toFixed(1),
      mediaTimeMs: mediaTimeMs.toFixed(1),
      hostPair: `[F${hostFrameA.index}, F${hostFrameB.index}]`,
      t: t.toFixed(2),
      source: presentedSource,
      presentedXPos,
      anomaly,
    });

    mediaTimeMs += targetIntervalMs;
  }

  return timeline;
}

console.log('=== SIMULACIÓN FORENSE: CADENCIA 30 FPS -> 60 FPS ===');
const sim30 = simulateScheduler('30fps', 10);
console.table(sim30);

console.log('\n=== SIMULACIÓN FORENSE: CADENCIA 24 FPS -> 60 FPS ===');
const sim24 = simulateScheduler('24fps', 12);
console.table(sim24);
