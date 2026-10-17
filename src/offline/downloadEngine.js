// Orunei Offline Download Engine
// Permite descargar episodios de anime para verlos 100% offline (estilo Netflix / Crunchyroll)
export { isNativeApp } from './platform.js';

const DB_NAME = 'orunei_offline_v1';
const DB_VERSION = 1;
const STORE_EPISODES = 'episodes';
const STORE_BLOBS = 'video_blobs';

let dbInstance = null;
let wakeLockSentinel = null;
const listeners = new Set();
const activeDownloads = new Map(); // id -> { controller, meta }

export async function ensurePersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        return await navigator.storage.persist();
      }
      return isPersisted;
    } catch {
      return false;
    }
  }
  return false;
}

async function acquireWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && !wakeLockSentinel) {
    try {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
    } catch {}
  }
}

function releaseWakeLock() {
  if (activeDownloads.size === 0 && wakeLockSentinel) {
    try {
      wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}

function showDownloadCompleteNotification(meta) {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Descarga completada en Orunei', {
          body: `${meta.animeTitle || 'Anime'} · ${meta.episodeTitle || 'Episodio'} ya está listo para ver sin conexión.`,
          icon: '/favicon.svg',
          badge: '/favicon.svg'
        });
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  } catch {}
}

function getDb() {
  if (dbInstance) return Promise.resolve(dbInstance);
  ensurePersistentStorage().catch(() => {});
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no soportado'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_EPISODES)) {
        db.createObjectStore(STORE_EPISODES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function subscribeDownloads(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try { fn(); } catch {}
  });
}

export function getActiveDownloads() {
  return Array.from(activeDownloads.values()).map(item => item.meta);
}

export async function getAllDownloads() {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EPISODES, 'readonly');
      const store = tx.objectStore(STORE_EPISODES);
      const req = store.getAll();
      req.onsuccess = () => {
        // Descartar descargas incompletas o vacías
        const items = (req.result || []).filter(item => item.status === 'completed' && (item.isHls || (item.sizeBytes && item.sizeBytes > 50000)));
        items.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
        resolve(items);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getDownload(animeId, episodeNumber) {
  const id = `${animeId}_${episodeNumber}`;
  if (activeDownloads.has(id)) {
    return activeDownloads.get(id).meta;
  }
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_EPISODES, 'readonly');
      const req = tx.objectStore(STORE_EPISODES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Obtiene la fuente de reproducción offline para un episodio.
 * Si es un stream HLS, genera una lista M3U8 local apuntando a los segmentos en Blob locales.
 */
export async function getOfflinePlaybackSource(animeId, episodeNumber) {
  const id = `${animeId}_${episodeNumber}`;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const req = tx.objectStore(STORE_BLOBS).get(id);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) return resolve(null);

        // Stream HLS segmentado offline
        if (record.isHls && Array.isArray(record.segments) && record.segments.length > 0) {
          const segUrls = [];
          for (let i = 0; i < record.segments.length; i++) {
            segUrls.push(URL.createObjectURL(record.segments[i]));
          }

          let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:15\n#EXT-X-MEDIA-SEQUENCE:1\n#EXT-X-PLAYLIST-TYPE:VOD\n';
          const durations = record.durations || [];
          for (let i = 0; i < segUrls.length; i++) {
            const dur = durations[i] || 4.0;
            m3u8 += `#EXTINF:${dur},\n${segUrls[i]}\n`;
          }
          m3u8 += '#EXT-X-ENDLIST\n';

          const playlistBlob = new Blob([m3u8], { type: 'application/vnd.apple.mpegurl' });
          const playlistUrl = URL.createObjectURL(playlistBlob);

          resolve({
            type: 'hls',
            url: playlistUrl,
            revoke: () => {
              URL.revokeObjectURL(playlistUrl);
              segUrls.forEach(u => URL.revokeObjectURL(u));
            },
          });
          return;
        }

        // Archivo único de video MP4
        if (record.blob) {
          const videoUrl = URL.createObjectURL(record.blob);
          resolve({
            type: 'file',
            url: videoUrl,
            revoke: () => URL.revokeObjectURL(videoUrl),
          });
          return;
        }

        resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getOfflineVideoBlob(animeId, episodeNumber) {
  const source = await getOfflinePlaybackSource(animeId, episodeNumber);
  return source ? source.url : null;
}

/**
 * Parsea el streamUrl. Si es un playlist HLS (.m3u8), resuelve la playlist de video y extrae los segmentos.
 * Soporta selección de calidad preferida (1080p, 720p, 480p, auto).
 */
async function resolveHlsPlaylist(streamUrl, signal, preferredQuality = 'auto') {
  const resp = await fetch(streamUrl, { signal });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();

  if (!text.includes('#EXTM3U')) {
    return { isHls: false, rawText: text, quality: 'direct' };
  }

  let mediaPlaylistUrl = streamUrl;
  let mediaPlaylistText = text;
  let selectedQuality = 'auto';

  // Master playlist con variantes de calidad (#EXT-X-STREAM-INF)
  if (text.includes('#EXT-X-STREAM-INF')) {
    const lines = text.split('\n');
    const variants = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const bwMatch = line.match(/BANDWIDTH=(\d+)/);
        const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
        const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
        const height = resMatch ? parseInt(resMatch[2], 10) : (bw > 2500000 ? 1080 : bw > 1200000 ? 720 : 480);

        for (let j = i + 1; j < lines.length; j++) {
          const next = lines[j].trim();
          if (next && !next.startsWith('#')) {
            variants.push({
              url: next,
              bandwidth: bw,
              height,
              label: `${height}p`,
            });
            break;
          }
        }
      }
    }

    let targetVariant = null;
    if (variants.length > 0) {
      if (preferredQuality && preferredQuality !== 'auto') {
        const targetHeight = parseInt(preferredQuality, 10);
        variants.sort((a, b) => Math.abs(a.height - targetHeight) - Math.abs(b.height - targetHeight));
        targetVariant = variants[0];
      } else {
        variants.sort((a, b) => b.bandwidth - a.bandwidth);
        targetVariant = variants[0];
      }
    }

    if (targetVariant) {
      selectedQuality = targetVariant.label;
      mediaPlaylistUrl = new URL(targetVariant.url, streamUrl).href;
      const mediaResp = await fetch(mediaPlaylistUrl, { signal });
      if (!mediaResp.ok) throw new Error(`HTTP ${mediaResp.status}`);
      mediaPlaylistText = await mediaResp.text();
    }
  }

  // Extraer segmentos y duraciones de la playlist de video
  const lines = mediaPlaylistText.split('\n');
  const segments = [];
  let currentDur = 4.0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:([0-9.]+)/);
      if (match) currentDur = parseFloat(match[1]);
    } else if (line && !line.startsWith('#')) {
      const fullUrl = new URL(line, mediaPlaylistUrl).href;
      segments.push({ url: fullUrl, duration: currentDur });
    }
  }

  return {
    isHls: true,
    segments,
    mediaPlaylistUrl,
  };
}

export async function startEpisodeDownload({
  animeId,
  animeTitle,
  animeCover,
  episodeNumber,
  episodeTitle,
  streamUrl,
  subtitles = [],
  quality = null,
}) {
  const id = `${animeId}_${episodeNumber}`;

  if (activeDownloads.has(id)) return;

  const preferredQuality = quality || getPreferredDownloadQuality();
  const controller = new AbortController();
  const meta = {
    id,
    animeId,
    animeTitle,
    animeCover,
    episodeNumber,
    episodeTitle: episodeTitle || `Episodio ${episodeNumber}`,
    status: 'downloading',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    sizeFormatted: 'Iniciando descarga…',
    downloadedAt: Date.now(),
    subtitles: [],
    quality: preferredQuality,
  };

  activeDownloads.set(id, { controller, meta });
  notifyListeners();
  acquireWakeLock().catch(() => {});

  try {
    // 1. Descargar y conservar subtítulos asociados
    const downloadedSubtitles = [];
    if (Array.isArray(subtitles) && subtitles.length > 0) {
      for (const track of subtitles) {
        if (!track.src) continue;
        try {
          const subResp = await fetch(track.src, { signal: controller.signal });
          if (subResp.ok) {
            const vttText = await subResp.text();
            downloadedSubtitles.push({
              id: track.id || `sub-${track.lang || 'es'}-${downloadedSubtitles.length}`,
              lang: track.lang || 'es',
              label: track.label || (track.lang === 'es' ? 'Español' : track.lang || 'Subtítulo'),
              default: Boolean(track.default),
              vttText,
            });
          }
        } catch (subErr) {
          console.warn(`[OfflineEngine] Subtítulo no descargable (${track.lang}):`, subErr);
        }
      }
    }
    meta.subtitles = downloadedSubtitles;

    // 2. Analizar si la fuente es HLS (.m3u8) o archivo directo
    meta.sizeFormatted = 'Analizando flujo de video…';
    notifyListeners();

    const hlsInfo = await resolveHlsPlaylist(streamUrl, controller.signal, preferredQuality);
    if (hlsInfo.quality) {
      meta.quality = hlsInfo.quality;
    }

    const db = await getDb();

    if (hlsInfo.isHls && hlsInfo.segments.length > 0) {
      const totalSegments = hlsInfo.segments.length;
      let completedSegments = 0;
      let totalDownloadedBytes = 0;
      const downloadedBlobs = new Array(totalSegments);
      const durations = hlsInfo.segments.map(s => s.duration);

      const CONCURRENCY = 4;
      let cursor = 0;

      async function worker() {
        while (cursor < totalSegments) {
          if (controller.signal.aborted) break;
          const index = cursor++;
          const seg = hlsInfo.segments[index];

          let attempts = 0;
          let success = false;
          while (attempts < 3 && !success) {
            if (controller.signal.aborted) break;
            try {
              const segResp = await fetch(seg.url, { signal: controller.signal });
              if (!segResp.ok) throw new Error(`HTTP ${segResp.status}`);
              const blob = await segResp.blob();
              downloadedBlobs[index] = blob;
              totalDownloadedBytes += blob.size;
              completedSegments++;
              success = true;

              meta.progress = Math.min(99, Math.round((completedSegments / totalSegments) * 100));
              meta.downloadedBytes = totalDownloadedBytes;
              meta.sizeFormatted = `${formatBytes(totalDownloadedBytes)} (${completedSegments}/${totalSegments} partes)`;
              notifyListeners();
            } catch (err) {
              attempts++;
              if (attempts >= 3) throw err;
              await new Promise(r => setTimeout(r, 600));
            }
          }
        }
      }

      const workers = Array.from(
        { length: Math.min(CONCURRENCY, totalSegments) },
        () => worker()
      );
      await Promise.all(workers);

      if (controller.signal.aborted) return;

      meta.progress = 100;
      meta.status = 'completed';
      meta.isHls = true;
      meta.segmentCount = totalSegments;
      meta.sizeBytes = totalDownloadedBytes;
      meta.sizeFormatted = formatBytes(totalDownloadedBytes);
      meta.downloadedAt = Date.now();

      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_EPISODES, STORE_BLOBS], 'readwrite');
        tx.objectStore(STORE_EPISODES).put(meta);
        tx.objectStore(STORE_BLOBS).put({
          id,
          isHls: true,
          segments: downloadedBlobs,
          durations,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      showDownloadCompleteNotification(meta);
    } else {
      // Descarga de archivo único de video directo (MP4/WebM)
      const response = await fetch(streamUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = Number(response.headers.get('content-length')) || 0;
      meta.totalBytes = contentLength;

      const reader = response.body.getReader();
      const chunks = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedBytes += value.length;

        meta.downloadedBytes = receivedBytes;
        if (contentLength > 0) {
          meta.progress = Math.min(99, Math.round((receivedBytes / contentLength) * 100));
          meta.sizeFormatted = `${formatBytes(receivedBytes)} / ${formatBytes(contentLength)}`;
        } else {
          meta.progress = 50;
          meta.sizeFormatted = formatBytes(receivedBytes);
        }

        notifyListeners();
      }

      const videoBlob = new Blob(chunks, { type: 'video/mp4' });
      meta.progress = 100;
      meta.status = 'completed';
      meta.isHls = false;
      meta.sizeBytes = videoBlob.size;
      meta.sizeFormatted = formatBytes(videoBlob.size);
      meta.downloadedAt = Date.now();

      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_EPISODES, STORE_BLOBS], 'readwrite');
        tx.objectStore(STORE_EPISODES).put(meta);
        tx.objectStore(STORE_BLOBS).put({ id, isHls: false, blob: videoBlob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      showDownloadCompleteNotification(meta);
    }

    activeDownloads.delete(id);
    releaseWakeLock();
    notifyListeners();
    return meta;
  } catch (error) {
    if (controller.signal.aborted) {
      activeDownloads.delete(id);
      releaseWakeLock();
      notifyListeners();
      return;
    }
    meta.status = 'error';
    meta.error = error.message;
    activeDownloads.delete(id);
    releaseWakeLock();
    notifyListeners();
    throw error;
  }
}

export function cancelDownload(animeId, episodeNumber) {
  const id = `${animeId}_${episodeNumber}`;
  const active = activeDownloads.get(id);
  if (active) {
    active.controller.abort();
    activeDownloads.delete(id);
    releaseWakeLock();
    notifyListeners();
  }
}

export async function deleteDownload(animeId, episodeNumber) {
  const id = `${animeId}_${episodeNumber}`;
  cancelDownload(animeId, episodeNumber);
  try {
    const db = await getDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_EPISODES, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_EPISODES).delete(id);
      tx.objectStore(STORE_BLOBS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyListeners();
    return true;
  } catch {
    return false;
  }
}

export async function clearAllDownloads() {
  try {
    const db = await getDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_EPISODES, STORE_BLOBS], 'readwrite');
      tx.objectStore(STORE_EPISODES).clear();
      tx.objectStore(STORE_BLOBS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    notifyListeners();
    return true;
  } catch {
    return false;
  }
}

export async function getTotalStorageUsed() {
  const all = await getAllDownloads();
  const total = all.reduce((sum, item) => sum + (item.sizeBytes || item.totalBytes || item.downloadedBytes || 0), 0);
  return {
    bytes: total,
    formatted: formatBytes(total),
    count: all.length,
  };
}

const PREFERRED_QUALITY_KEY = 'orunei_preferred_download_quality';
const AUTO_DELETE_KEY = 'orunei_auto_delete_watched';

export function getPreferredDownloadQuality() {
  if (typeof window === 'undefined' || !window.localStorage) return 'auto';
  try {
    return window.localStorage.getItem(PREFERRED_QUALITY_KEY) || 'auto';
  } catch {
    return 'auto';
  }
}

export function setPreferredDownloadQuality(quality) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(PREFERRED_QUALITY_KEY, quality || 'auto');
  } catch {}
}

export function isAutoDeleteWatchedEnabled() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    return window.localStorage.getItem(AUTO_DELETE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoDeleteWatched(enabled) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(AUTO_DELETE_KEY, enabled ? 'true' : 'false');
  } catch {}
}
