import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { formatBytes } from '../src/offline/downloadEngine.js'
import { CURRENT_APP_VERSION, GITHUB_REPO, LATEST_APK_URL } from '../src/offline/appUpdater.js'

const libraryPage = fs.readFileSync(new URL('../src/components/LibraryPage.jsx', import.meta.url), 'utf8')
const animeDetail = fs.readFileSync(new URL('../src/components/AnimeDetail.jsx', import.meta.url), 'utf8')
const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8')
const workflow = fs.readFileSync(new URL('../.github/workflows/build-apk.yml', import.meta.url), 'utf8')
const capConfig = fs.readFileSync(new URL('../capacitor.config.json', import.meta.url), 'utf8')
const downloadEngine = fs.readFileSync(new URL('../src/offline/downloadEngine.js', import.meta.url), 'utf8')
const offlinePlayer = fs.readFileSync(new URL('../src/components/OfflinePlayerModal.jsx', import.meta.url), 'utf8')
const animePlayer = fs.readFileSync(new URL('../src/components/AnimePlayer.jsx', import.meta.url), 'utf8')
const platform = fs.readFileSync(new URL('../src/offline/platform.js', import.meta.url), 'utf8')

test('formats bytes correctly into human readable units', () => {
  assert.equal(formatBytes(0), '0 MB')
  assert.equal(formatBytes(1024), '1 KB')
  assert.equal(formatBytes(1048576), '1 MB')
  assert.equal(formatBytes(157286400), '150 MB')
  assert.equal(formatBytes(1073741824), '1 GB')
})

test('app updater configuration is properly defined', () => {
  assert.equal(CURRENT_APP_VERSION, '1.0.0')
  assert.equal(GITHUB_REPO, 'AndrehhX/orunei-v2')
  assert.match(LATEST_APK_URL, /orunei\.apk$/)
})

test('library page includes Descargas filter and offline storage controls only for native app', () => {
  assert.match(libraryPage, /\['downloads', 'Descargas'\]/)
  assert.match(libraryPage, /isNativeApp/)
  assert.match(libraryPage, /getAllDownloads/)
  assert.match(libraryPage, /OfflinePlayerModal/)
  assert.match(libraryPage, /Liberar espacio \(Borrar todo\)/)
  assert.match(libraryPage, /Reproducir offline/)
})

test('anime detail includes episode download controls only for native app', () => {
  assert.match(animeDetail, /isNativeApp/)
  assert.match(animeDetail, /startEpisodeDownload/)
  assert.match(animeDetail, /handleDownload/)
  assert.match(animeDetail, /subtitles:\s*playback\?\.subtitles\?\.tracks/)
  assert.match(animeDetail, /Descargar para ver sin internet/)
  assert.match(animeDetail, /CheckCircle2/)
})

test('app shell maintains native platform isolation and update manager', () => {
  assert.match(app, /isNativeApp/)
  assert.match(app, /ActiveDownloadBar/)
  assert.match(app, /UpdateModal/)
  assert.match(app, /checkForUpdate/)
})


test('offline engine guarantees background downloads, persistent storage, and subtitle preservation', () => {
  assert.match(downloadEngine, /ensurePersistentStorage/)
  assert.match(downloadEngine, /navigator\.storage\?\.persist/)
  assert.match(downloadEngine, /acquireWakeLock/)
  assert.match(downloadEngine, /downloadedSubtitles/)
  assert.match(downloadEngine, /getActiveDownloads/)
  assert.match(downloadEngine, /getOfflinePlaybackSource/)
  assert.match(downloadEngine, /resolveHlsPlaylist/)
  assert.match(platform, /Capacitor\.isNativePlatform/)
})

test('offline player and anime player support downloaded subtitles and zero backend playback', () => {
  assert.match(offlinePlayer, /getOfflinePlaybackSource/)
  assert.match(offlinePlayer, /offlineSubtitles/)
  assert.match(offlinePlayer, /<track/)
  assert.match(offlinePlayer, /Subtítulos Offline/)

  assert.match(animePlayer, /getOfflinePlaybackSource/)
  assert.match(animePlayer, /getDownload/)
  assert.match(animePlayer, /offlineTracks/)
})

test('capacitor config and android workflow are properly set up', () => {
  const config = JSON.parse(capConfig)
  assert.equal(config.appId, 'com.orunei.app')
  assert.equal(config.appName, 'Orunei')
  assert.equal(config.webDir, 'dist')

  assert.match(workflow, /permissions:\s+contents:\s+write/)
  assert.match(workflow, /assembleRelease/)
  assert.match(workflow, /orunei\.apk/)
  assert.match(workflow, /softprops\/action-gh-release/)
})
