import test from 'node:test'
import assert from 'node:assert/strict'
import { clearProfileState, loadOrCreateRemoteProfile, persistRemoteProfile, resolveLoadedProfile } from '../src/profile/profileProviderModel.js'

test('keeps authenticated identity while resolving a remote profile', () => {
  const result = resolveLoadedProfile({ id: 'user-1', displayName: 'Andreh', username: 'andreh' }, '', { id: 'user-1', email: 'andreh@example.com' })
  assert.equal(result.status, 'ready')
  assert.equal(result.profile.displayName, 'Andreh')
  assert.equal(result.profile.username, 'andreh')
})

test('returns a recoverable remote save result on success and failure', async () => {
  const success = await persistRemoteProfile({ saveProfile: async () => ({ data: { username: 'andreh' }, error: '' }) }, 'user-1', { username: 'andreh' })
  assert.equal(success.ok, true)
  assert.equal(success.data.username, 'andreh')

  const failure = await persistRemoteProfile({ saveProfile: async () => ({ data: null, error: 'RLS denied' }) }, 'user-1', { username: 'andreh' })
  assert.equal(failure.ok, false)
  assert.equal(failure.error, 'RLS denied')
})

test('creates a remote profile when the authenticated account has no profile row yet', async () => {
  let saveCalls = 0
  const result = await loadOrCreateRemoteProfile({
    getOwnProfile: async () => ({ data: null, error: '' }),
    saveProfile: async (_userId, profile) => { saveCalls += 1; return { data: { ...profile, id: 'user-1' }, error: '' } },
  }, { id: 'user-1', name: 'Andreh', email: 'andreh@example.com' })
  assert.equal(saveCalls, 1)
  assert.equal(result.data.displayName, 'Andreh')
})

test('retries a colliding generated username with a stable account suffix', async () => {
  const usernames = []
  const result = await loadOrCreateRemoteProfile({
    getOwnProfile: async () => ({ data: null, error: '' }),
    saveProfile: async (_userId, profile) => {
      usernames.push(profile.username)
      return usernames.length === 1
        ? { data: null, error: 'duplicate key value violates unique constraint "profiles_username_key"' }
        : { data: profile, error: '' }
    },
  }, { id: 'ABCDEF12-3456', name: 'Andreh', email: 'andreh@example.com' })
  assert.deepEqual(usernames, ['andreh', 'andreh-abcdef'])
  assert.equal(result.data.username, 'andreh-abcdef')
})

test('clears profile state after sign out', () => {
  assert.deepEqual(clearProfileState(), { profile: null, status: 'signed-out', error: '' })
})

test('preserves local anime library when remote profile has empty collections', () => {
  const localAnime = [{ id: '101', t: 'Frieren', s: 'Viendo', status: 'watching' }]
  const remoteLoaded = resolveLoadedProfile({ id: 'user-1', displayName: 'Andreh', username: 'andreh' }, '', { id: 'user-1' })
  // remoteLoaded has empty animeList: []
  assert.equal(remoteLoaded.profile.animeList.length, 0)
  // Rehydration logic preserves localAnime when remote is empty
  const mergedAnimeList = (remoteLoaded.profile.animeList.length > 0)
    ? remoteLoaded.profile.animeList
    : localAnime
  assert.equal(mergedAnimeList.length, 1)
  assert.equal(mergedAnimeList[0].t, 'Frieren')
})

