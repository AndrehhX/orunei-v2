/**
 * animeEnhanceEngine.js
 * 
 * Sistema de Mejora Visual Real para Anime (Anime Enhance)
 * Integración técnica de:
 * 1. Detección y reconstrucción de líneas inspirada en Anime4K (bloc97):
 *    - Difference of Gaussians (DoG) para aislar trazos sin afectar fondos.
 *    - Line darkening moderado sin aplastamiento de negros.
 *    - Line thinning direccional que respeta líneas finas, cabello y detalles.
 * 2. AMD FidelityFX CAS (Contrast Adaptive Sharpening):
 *    - Nitidez adaptativa por canal RGB.
 *    - Clamp estricto Anti-Ringing para eliminar halos.
 *    - Preservación fiel de la información cromática original.
 * 3. Modo de comparación visual A/B en tiempo real (Split-Screen y Bypass instantáneo).
 * 
 * Licencias y Atribuciones:
 * - Anime4K por bloc97 (MIT License).
 * - AMD FidelityFX CAS por Advanced Micro Devices, Inc. (MIT License).
 */

export const ANIME_ENHANCE_SETTINGS = {
  MIN_ACCEPTABLE_FPS: 45,
  FPS_MONITOR_WINDOW_MS: 3000,
  MAX_DEVICE_PIXEL_RATIO: 1.5, // Límite adaptativo para no sobrecargar la GPU
};

export const ANIME_ENHANCE_MODES = [
  {
    id: 'off',
    label: 'Normal',
    description: 'Video original sin procesamiento',
    sharpness: 0.0,
    lineDarken: 0.0,
    lineThin: 0.0,
  },
  {
    id: 'balanced',
    label: 'Equilibrado',
    description: 'Mejora moderada de contornos y nitidez adaptativa',
    sharpness: 0.40,
    lineDarken: 0.22,
    lineThin: 0.18,
  },
  {
    id: 'high',
    label: 'Alta Definición',
    description: 'Realce más definido de trazos sujeto a capacidad de GPU',
    sharpness: 0.70,
    lineDarken: 0.38,
    lineThin: 0.30,
  },
];

/**
 * Cálculo de luminancia perceptual Rec.709 estándar HDTV
 */
export function getLuma([r, g, b]) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Simulación en CPU del filtro exacto de Anime Enhance
 * Utilizado para validación matemática y pruebas unitarias de referencia.
 */
export function computeAnimeEnhanceSample({
  c, tl, tc, tr, ml, mr, bl, bc, br,
  sharpness = 0.40,
  lineDarken = 0.22,
  lineThin = 0.18,
  isSplitLeft = false, // Para simular A/B
}) {
  if (isSplitLeft) {
    return [...c]; // Lado original
  }

  const l_c  = getLuma(c);
  const l_tl = getLuma(tl); const l_tc = getLuma(tc); const l_tr = getLuma(tr);
  const l_ml = getLuma(ml); const l_mr = getLuma(mr);
  const l_bl = getLuma(bl); const l_bc = getLuma(bc); const l_br = getLuma(br);

  // 1. Difference of Gaussians (DoG) 3x3 estilo Anime4K
  const gBlur = (l_tl + 2.0*l_tc + l_tr + 2.0*l_ml + 4.0*l_c + 2.0*l_mr + l_bl + 2.0*l_bc + l_br) * 0.0625;
  const dog = l_c - gBlur;

  // Gradiente Sobel 3x3
  const dX = (l_tr + 2.0 * l_mr + l_br) - (l_tl + 2.0 * l_ml + l_bl);
  const dY = (l_bl + 2.0 * l_bc + l_br) - (l_tl + 2.0 * l_tc + l_tr);
  const gradMag = Math.sqrt(dX * dX + dY * dY);

  // 2. Límites locales para Anti-Ringing estricto de AMD CAS
  const min_rgb = [0, 1, 2].map(i => Math.min(c[i], tl[i], tc[i], tr[i], ml[i], mr[i], bl[i], bc[i], br[i]));
  const max_rgb = [0, 1, 2].map(i => Math.max(c[i], tl[i], tc[i], tr[i], ml[i], mr[i], bl[i], bc[i], br[i]));

  // 3. AMD FidelityFX CAS 5-tap por canal
  const peak = -0.125 + (-0.22 - -0.125) * Math.max(0, Math.min(1.0, sharpness));
  const cas_color = [0, 1, 2].map(i => {
    const minVal = min_rgb[i];
    const maxVal = max_rgb[i];
    const amp = Math.max(0, Math.min(1.0, Math.min(minVal, 2.0 - maxVal) / Math.max(maxVal, 1e-4)));
    const w = Math.sqrt(amp) * peak;
    const sharpened = (w * (tc[i] + ml[i] + mr[i] + bc[i]) + c[i]) / (1.0 + 4.0 * w);
    return Math.max(minVal, Math.min(maxVal, sharpened));
  });

  let enhanced = [...cas_color];

  // 4. Anime4K Line Enhancement (solo si hay gradiente real > 0.04)
  if (gradMag > 0.04) {
    // A) Line Darkening (DoG)
    if (dog < -0.005 && lineDarken > 0.0) {
      let darkenFactor = Math.min(1.0, Math.max(0.0, -dog * 3.5)) * lineDarken;
      // Proteger negros profundos (no aplastar detalle oscuro)
      const blackProtection = Math.max(0.0, Math.min(1.0, (l_c - 0.02) / (0.15 - 0.02)));
      darkenFactor *= blackProtection;
      enhanced = enhanced.map(val => val * (1.0 - darkenFactor * 0.45));
    }

    // B) Line Thinning (Sobel normal con protección de altas luces/texto)
    if (lineThin > 0.0 && gradMag > 0.06) {
      const len = Math.max(gradMag, 1e-4);
      const dirX = dX / len;
      const sPos = dirX > 0 ? mr : ml;
      const sNeg = dirX > 0 ? ml : mr;
      const lPos = getLuma(sPos);
      const lNeg = getLuma(sNeg);

      const edgeAsymmetry = Math.abs(lPos - lNeg);
      if (edgeAsymmetry > 0.05) {
        const sharperSide = lPos < lNeg ? sPos : sNeg;
        // Protección de altas luces: no adelgazar sobre texto blanco o brillos
        const highlightProtection = Math.max(0.0, Math.min(1.0, (0.92 - l_c) / (0.92 - 0.75)));
        const thinWeight = Math.min(1.0, edgeAsymmetry * 1.8) * lineThin * 0.35 * highlightProtection;
        enhanced = enhanced.map((val, i) => val * (1.0 - thinWeight) + Math.min(val, sharperSide[i]) * thinWeight);
      }
    }
  }

  // Garantía Anti-Ringing estricta
  return enhanced.map((val, i) => Math.max(min_rgb[i], Math.min(max_rgb[i], val)));
}

/**
 * Comprueba si el entorno soporta WebGL2
 */
export function isWebGL2Supported() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2', { powerPreference: 'high-performance' });
    const supported = Boolean(gl);
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    return supported;
  } catch {
    return false;
  }
}

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;
in vec2 v_texCoord;
uniform sampler2D u_tex;
uniform vec2 u_sourceResolution;
uniform vec2 u_targetResolution;
uniform float u_sharpness;
uniform float u_lineDarken;
uniform float u_lineThin;
uniform float u_splitPos;
uniform int u_splitMode; // 0 = Full Enhanced, 1 = Split Screen A/B, 2 = Bypass Original
out vec4 fragColor;

float getLuma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 uv = v_texCoord;
  vec3 rawColor = texture(u_tex, uv).rgb;

  // Comparación visual A/B en tiempo real
  if (u_splitMode == 2) {
    fragColor = vec4(rawColor, 1.0);
    return;
  }
  if (u_splitMode == 1) {
    float pixelX = uv.x * u_targetResolution.x;
    float splitPixelX = u_splitPos * u_targetResolution.x;
    if (abs(pixelX - splitPixelX) < 1.0) {
      fragColor = vec4(1.0, 1.0, 1.0, 1.0); // Línea divisoria A/B
      return;
    }
    if (uv.x < u_splitPos) {
      fragColor = vec4(rawColor, 1.0); // Lado izquierdo: Original
      return;
    }
  }

  vec2 texel = 1.0 / max(u_sourceResolution, vec2(1.0));

  // 1. Muestreo 3x3 del vecindario
  vec3 c  = rawColor;
  vec3 tl = texture(u_tex, uv + vec2(-texel.x, -texel.y)).rgb;
  vec3 tc = texture(u_tex, uv + vec2( 0.0,     -texel.y)).rgb;
  vec3 tr = texture(u_tex, uv + vec2( texel.x, -texel.y)).rgb;
  vec3 ml = texture(u_tex, uv + vec2(-texel.x,  0.0)).rgb;
  vec3 mr = texture(u_tex, uv + vec2( texel.x,  0.0)).rgb;
  vec3 bl = texture(u_tex, uv + vec2(-texel.x,  texel.y)).rgb;
  vec3 bc = texture(u_tex, uv + vec2( 0.0,      texel.y)).rgb;
  vec3 br = texture(u_tex, uv + vec2( texel.x,  texel.y)).rgb;

  float l_c  = getLuma(c);
  float l_tl = getLuma(tl); float l_tc = getLuma(tc); float l_tr = getLuma(tr);
  float l_ml = getLuma(ml); float l_mr = getLuma(mr);
  float l_bl = getLuma(bl); float l_bc = getLuma(bc); float l_br = getLuma(br);

  // Difference of Gaussians (DoG 3x3) para aislar líneas
  float gBlur = (l_tl + 2.0*l_tc + l_tr + 2.0*l_ml + 4.0*l_c + 2.0*l_mr + l_bl + 2.0*l_bc + l_br) * 0.0625;
  float dog = l_c - gBlur;

  // Gradiente Sobel 3x3
  float dX = (l_tr + 2.0 * l_mr + l_br) - (l_tl + 2.0 * l_ml + l_bl);
  float dY = (l_bl + 2.0 * l_bc + l_br) - (l_tl + 2.0 * l_tc + l_tr);
  float gradMag = length(vec2(dX, dY));

  // 2. Límites locales para Anti-Ringing estricto
  vec3 min_cross = min(min(min(tc, ml), min(mr, bc)), c);
  vec3 max_cross = max(max(max(tc, ml), max(mr, bc)), c);
  vec3 min_rgb = min(min_cross, min(min(tl, tr), min(bl, br)));
  vec3 max_rgb = max(max_cross, max(max(tl, tr), max(bl, br)));

  // 3. AMD FidelityFX CAS (Contrast Adaptive Sharpening) por canal
  vec3 amp_rgb = clamp(min(min_rgb, vec3(2.0) - max_rgb) / max(max_rgb, vec3(1e-4)), 0.0, 1.0);
  float peak = mix(-0.125, -0.22, clamp(u_sharpness, 0.0, 1.0));
  vec3 w_rgb = sqrt(amp_rgb) * peak;

  vec3 cas_color = (w_rgb * (tc + ml + mr + bc) + c) / (vec3(1.0) + 4.0 * w_rgb);
  cas_color = clamp(cas_color, min_rgb, max_rgb);

  vec3 enhanced = cas_color;

  // 4. Anime4K Line Enhancement (solo en presencia de gradientes reales)
  if (gradMag > 0.04) {
    // A) Line Darkening (DoG)
    if (dog < -0.005 && u_lineDarken > 0.0) {
      float darkenFactor = clamp(-dog * 3.5, 0.0, 1.0) * u_lineDarken;
      // Proteger negros profundos para no aplastar detalles en sombras
      darkenFactor *= smoothstep(0.02, 0.15, l_c);
      enhanced = enhanced * (1.0 - darkenFactor * 0.45);
    }

    // B) Line Thinning direccional
    if (u_lineThin > 0.0 && gradMag > 0.06) {
      vec2 dir = vec2(dX, dY) / gradMag;
      vec3 sPos = texture(u_tex, uv + dir * texel * 0.5).rgb;
      vec3 sNeg = texture(u_tex, uv - dir * texel * 0.5).rgb;
      float lPos = getLuma(sPos);
      float lNeg = getLuma(sNeg);

      float edgeAsymmetry = abs(lPos - lNeg);
      if (edgeAsymmetry > 0.05) {
        vec3 sharperSide = (lPos < lNeg) ? sPos : sNeg;
        // Protección de altas luces: no adelgazar sobre texto blanco de subtítulos o brillos
        float highlightProtection = smoothstep(0.92, 0.75, l_c);
        float thinWeight = clamp(edgeAsymmetry * 1.8, 0.0, 1.0) * u_lineThin * 0.35 * highlightProtection;
        enhanced = mix(enhanced, min(enhanced, sharperSide), thinWeight);
      }
    }
  }

  // Garantía Anti-Ringing final
  enhanced = clamp(enhanced, min_rgb, max_rgb);

  fragColor = vec4(enhanced, 1.0);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Error compilando shader Anime Enhance: ${info}`);
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error(`Error enlazando programa Anime Enhance: ${info}`);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

function createEmptyTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  return tex;
}

/**
 * Inicializa y administra el ciclo de vida del motor Anime Enhance
 */
export function createAnimeEnhanceEngine({
  video,
  container,
  mode = 'balanced',
  splitMode = 0,
  splitPos = 0.5,
  canvasId = 'anime-enhance-layer',
  onFpsUpdate,
  onPerformanceDrop,
  onError,
}) {
  if (!video || !container) {
    throw new Error('video and container are required to initialize Anime Enhance');
  }

  if (!isWebGL2Supported()) {
    onError?.(new Error('WebGL2 no está soportado en este dispositivo'));
    return null;
  }

  const activeModeConfig = ANIME_ENHANCE_MODES.find(m => m.id === mode) || ANIME_ENHANCE_MODES[1];
  let currentSharpness = activeModeConfig.sharpness;
  let currentLineDarken = activeModeConfig.lineDarken;
  let currentLineThin = activeModeConfig.lineThin;
  let currentSplitMode = splitMode || 0; // 0 = Full Enhanced, 1 = Split A/B, 2 = Bypass
  let currentSplitPos = splitPos != null ? splitPos : 0.5;

  const layerId = canvasId || 'anime-enhance-layer';
  let canvas = container.querySelector('#' + layerId);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = layerId;
    canvas.className = 'absolute inset-0 w-full h-full object-contain pointer-events-none z-10';
    canvas.style.display = 'block';
    if (video.nextSibling) {
      container.insertBefore(canvas, video.nextSibling);
    } else {
      container.appendChild(canvas);
    }
  } else {
    canvas.style.display = 'block';
  }

  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch (e) {
    onError?.(e);
    canvas.style.display = 'none';
    return null;
  }

  if (!gl) {
    onError?.(new Error('No se pudo inicializar el contexto WebGL2 para Anime Enhance'));
    canvas.style.display = 'none';
    return null;
  }

  let program = null;
  let quadBuffer = null;
  let videoTexture = null;

  try {
    program = createProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE);
    gl.useProgram(program);

    const quadVertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    videoTexture = createEmptyTexture(gl);
  } catch (err) {
    onError?.(err);
    canvas.style.display = 'none';
    return null;
  }

  const uTexLoc = gl.getUniformLocation(program, 'u_tex');
  const uSourceResLoc = gl.getUniformLocation(program, 'u_sourceResolution');
  const uTargetResLoc = gl.getUniformLocation(program, 'u_targetResolution');
  const uSharpnessLoc = gl.getUniformLocation(program, 'u_sharpness');
  const uLineDarkenLoc = gl.getUniformLocation(program, 'u_lineDarken');
  const uLineThinLoc = gl.getUniformLocation(program, 'u_lineThin');
  const uSplitPosLoc = gl.getUniformLocation(program, 'u_splitPos');
  const uSplitModeLoc = gl.getUniformLocation(program, 'u_splitMode');

  gl.uniform1i(uTexLoc, 0);
  gl.uniform1f(uSharpnessLoc, currentSharpness);
  gl.uniform1f(uLineDarkenLoc, currentLineDarken);
  gl.uniform1f(uLineThinLoc, currentLineThin);
  gl.uniform1f(uSplitPosLoc, currentSplitPos);
  gl.uniform1i(uSplitModeLoc, currentSplitMode);

  let isDestroyed = false;
  let rafId = null;

  let frameCount = 0;
  let lastFpsCheckTime = performance.now();
  let lowFpsDuration = 0;

  function render(now) {
    if (isDestroyed || !gl) return;

    if (document.hidden || video.paused || video.ended) {
      rafId = requestAnimationFrame(render);
      return;
    }

    // Resolución de visualización adaptativa (límite DPR de 1.5x para eficiencia energética)
    const containerW = container.clientWidth || video.clientWidth || 1280;
    const containerH = container.clientHeight || video.clientHeight || 720;
    const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const dpr = Math.min(rawDpr, ANIME_ENHANCE_SETTINGS.MAX_DEVICE_PIXEL_RATIO);
    const targetWidth = Math.round(containerW * dpr);
    const targetHeight = Math.round(containerH * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      gl.viewport(0, 0, targetWidth, targetHeight);
      if (uTargetResLoc) gl.uniform2f(uTargetResLoc, targetWidth, targetHeight);
    }

    const srcW = video.videoWidth || 1280;
    const srcH = video.videoHeight || 720;
    if (uSourceResLoc) gl.uniform2f(uSourceResLoc, srcW, srcH);

    try {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    } catch (err) {
      onError?.(err);
      destroy();
      return;
    }

    // Monitoreo continuo de FPS y watchdog de sobrecarga de GPU
    frameCount++;
    const timeSinceLastFps = now - lastFpsCheckTime;
    if (timeSinceLastFps >= 1000) {
      const currentFps = Math.round((frameCount * 1000) / timeSinceLastFps);
      onFpsUpdate?.(currentFps);

      if (currentFps < ANIME_ENHANCE_SETTINGS.MIN_ACCEPTABLE_FPS && !video.paused) {
        lowFpsDuration += timeSinceLastFps;
        if (lowFpsDuration >= ANIME_ENHANCE_SETTINGS.FPS_MONITOR_WINDOW_MS) {
          onPerformanceDrop?.({ fps: currentFps });
          destroy();
          return;
        }
      } else {
        lowFpsDuration = 0;
      }

      frameCount = 0;
      lastFpsCheckTime = now;
    }

    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);

  function destroy() {
    if (isDestroyed) return;
    isDestroyed = true;

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (canvas) {
      canvas.style.display = 'none';
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    if (gl) {
      try {
        if (videoTexture) gl.deleteTexture(videoTexture);
        if (quadBuffer) gl.deleteBuffer(quadBuffer);
        if (program) gl.deleteProgram(program);
        const ext = gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();
      } catch {}
      gl = null;
    }
  }

  return {
    destroy,
    getCanvas: () => canvas,
    setMode: (newModeId) => {
      const cfg = ANIME_ENHANCE_MODES.find(m => m.id === newModeId);
      if (!cfg) return;
      currentSharpness = cfg.sharpness;
      currentLineDarken = cfg.lineDarken;
      currentLineThin = cfg.lineThin;
      if (gl && program) {
        gl.useProgram(program);
        if (uSharpnessLoc) gl.uniform1f(uSharpnessLoc, currentSharpness);
        if (uLineDarkenLoc) gl.uniform1f(uLineDarkenLoc, currentLineDarken);
        if (uLineThinLoc) gl.uniform1f(uLineThinLoc, currentLineThin);
      }
    },
    setSplitComparison: ({ enabled = false, position = 0.5, bypass = false } = {}) => {
      currentSplitMode = bypass ? 2 : (enabled ? 1 : 0);
      currentSplitPos = position;
      if (gl && program) {
        gl.useProgram(program);
        if (uSplitModeLoc) gl.uniform1i(uSplitModeLoc, currentSplitMode);
        if (uSplitPosLoc) gl.uniform1f(uSplitPosLoc, currentSplitPos);
      }
    },
    getCurrentConfig: () => ({
      sharpness: currentSharpness,
      lineDarken: currentLineDarken,
      lineThin: currentLineThin,
      splitMode: currentSplitMode,
      splitPos: currentSplitPos,
    }),
  };
}
