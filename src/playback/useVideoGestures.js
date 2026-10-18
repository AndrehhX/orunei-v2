/**
 * Utilidades y hook para gestos táctiles y Picture-in-Picture (PiP)
 * Soporta doble toque (±10s), control de brillo/volumen por deslizamiento vertical y PiP.
 */

import { useState, useRef, useCallback } from 'react';

export function isPiPSupported(video = null) {
  const standard = typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
  const webkit = Boolean(video?.webkitSupportsPresentationMode && typeof video.webkitSetPresentationMode === 'function');
  return standard || webkit;
}

export async function togglePiP(video) {
  if (!video) return false;
  try {
    const hasDoc = typeof document !== 'undefined';
    // 1. Estándar W3C (Chrome, Edge, Firefox, Safari macOS)
    if (hasDoc && document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      return false;
    } else if (hasDoc && document.pictureInPictureEnabled && typeof video.requestPictureInPicture === 'function') {
      await video.requestPictureInPicture();
      return true;
    }

    // 2. Modo nativo WebKit para iOS Safari (iPhone y iPad)
    if (typeof video.webkitSetPresentationMode === 'function') {
      const isCurrentlyPiP = video.webkitPresentationMode === 'picture-in-picture';
      video.webkitSetPresentationMode(isCurrentlyPiP ? 'inline' : 'picture-in-picture');
      return !isCurrentlyPiP;
    }
  } catch (err) {
    console.warn('[PiP] Error toggling picture-in-picture:', err);
  }
  return false;
}

/**
 * Hook para gestionar doble toque (±10s) y deslizamiento de brillo y volumen en el contenedor de video.
 */
export function useVideoGestures({ videoRef, onSeekDelta }) {
  const [gestureFeedback, setGestureFeedback] = useState(null);
  const [brightness, setBrightness] = useState(1); // 1 = 100%
  const [isPiPActive, setIsPiPActive] = useState(false);

  const lastTapRef = useRef({ time: 0, x: 0 });
  const touchStartRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  const showFeedback = useCallback((data, duration = 800) => {
    setGestureFeedback(data);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setGestureFeedback(null);
    }, duration);
  }, []);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    touchStartRef.current = {
      x,
      y,
      width: rect.width,
      height: rect.height,
      initialBrightness: brightness,
      initialVolume: videoRef.current ? videoRef.current.volume : 1,
      isMoving: false,
    };
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const start = touchStartRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentY = touch.clientY - rect.top;
    const deltaY = start.y - currentY; // Arriba = positivo

    // Umbral mínimo de movimiento para considerar arrastre vertical
    if (Math.abs(deltaY) > 20) {
      start.isMoving = true;
      const sensitivity = 0.005;

      // Lado izquierdo: Brillo (0.4 a 1.6)
      if (start.x < start.width * 0.4) {
        const nextB = Math.min(1.6, Math.max(0.4, start.initialBrightness + deltaY * sensitivity));
        setBrightness(nextB);
        showFeedback({ type: 'brightness', value: Math.round(nextB * 100) }, 1000);
      }
      // Lado derecho: Volumen (0 a 1)
      else if (start.x > start.width * 0.6) {
        const nextV = Math.min(1, Math.max(0, start.initialVolume + deltaY * sensitivity));
        if (videoRef.current) {
          videoRef.current.volume = nextV;
        }
        showFeedback({ type: 'volume', value: Math.round(nextV * 100) }, 1000);
      }
    }
  };

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;

    if (!start || start.isMoving) return;

    // Si fue un tap quieto (no swipe), evaluar doble toque
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const xDiff = Math.abs(start.x - lastTapRef.current.x);

    if (timeDiff < 320 && xDiff < 80) {
      // Doble toque detectado
      const video = videoRef.current;
      const width = start.width;

      if (start.x < width * 0.38) {
        // Doble toque izquierda: Retroceder 10s
        if (video) {
          const nextTime = Math.max(0, video.currentTime - 10);
          video.currentTime = nextTime;
          onSeekDelta?.(-10);
        }
        showFeedback({ type: 'seek', direction: 'backward', text: '-10s' });
      } else if (start.x > width * 0.62) {
        // Doble toque derecha: Adelantar 10s
        if (video) {
          const nextTime = Math.min(video.duration || Infinity, video.currentTime + 10);
          video.currentTime = nextTime;
          onSeekDelta?.(10);
        }
        showFeedback({ type: 'seek', direction: 'forward', text: '+10s' });
      }

      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: start.x };
    }
  };

  return {
    brightness,
    gestureFeedback,
    showFeedback,
    isPiPActive,
    setIsPiPActive,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
