import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProfileImagePath, createProfileRepository, normalizeRemoteProfile } from '../src/profile/profileRepository.js'

function makeClient({ profile, privacy = [], anime = [], lists = [], activity = [], uploadError = null }) {
  const calls = []
  const tableData = { profile_anime: anime, profile_lists: lists, profile_activity: activity }
  const builders = new Map()
  const makeBuilder = (table) => {
    let inserted = null
    const builder = {
      select() { return builder },
      eq() { return builder },
      order() { return builder },
      upsert(payload) { calls.push({ type: 'upsert', payload }); return builder },
      insert(payload) { inserted = { id: 'activity-new', ...payload, created_at: '2026-01-02T00:00:00.000Z' }; calls.push({ type: 'insert', payload }); return builder },
      delete() { calls.push({ type: 'delete' }); return builder },
      maybeSingle() { return Promise.resolve({ data: profile, error: null }) },
      single() { return Promise.resolve({ data: inserted || (table === 'profiles' ? profile : tableData[table]?.at(-1) || null), error: null }) },
      then(resolve) { return Promise.resolve({ data: tableData[table] || [], error: null }).then(resolve) },
    }
    builders.set(table, builder)
    return builder
  }
  return {
    calls,
    from(table) {
      calls.push({ type: 'from', table })
      if (table === 'profile_privacy') return {
        select() { return this },
        eq() { return Promise.resolve({ data: privacy, error: null }) },
      }
      return builders.get(table) || makeBuilder(table)
    },
    storage: {
      from() {
        return {
          upload: () => Promise.resolve({ error: uploadError }),
          getPublicUrl: (path) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
        }
      },
    },
  }
}

test('normalizes remote profile columns into the existing profile contract', () => {
  const profile = normalizeRemoteProfile({
    id: 'user-1',
    display_name: 'Andreh',
    username: 'andreh',
    bio: 'Anime y diseño',
    avatar_url: 'https://cdn.example/avatar.jpg',
    banner_url: 'https://cdn.example/banner.jpg',
    privacy: [{ section: 'animeList', visibility: 'public' }],
  }, { name: 'Fallback', email: 'fallback@example.com' })
  assert.equal(profile.displayName, 'Andreh')
  assert.equal(profile.id, 'user-1')
  assert.equal(profile.avatar, 'https://cdn.example/avatar.jpg')
  assert.equal(profile.banner, 'https://cdn.example/banner.jpg')
  assert.equal(profile.privacy.animeList, 'public')
})

test('reads own profile and writes an explicit owner-scoped patch', async () => {
  const client = makeClient({ profile: { id: 'user-1', display_name: 'Andreh', username: 'andreh' } })
  const repository = createProfileRepository(client)
  const own = await repository.getOwnProfile('user-1')
  assert.equal(own.error, '')
  assert.equal(own.data.username, 'andreh')
  const saved = await repository.saveProfile('user-1', { displayName: 'Andreh Nuevo', bio: 'ok' })
  assert.equal(saved.error, '')
  assert.equal(client.calls.find((call) => call.type === 'upsert').payload.id, 'user-1')
})

test('returns privacy rows with a public profile and preserves upload errors', async () => {
  const client = makeClient({
    profile: { id: 'user-2', display_name: 'Mika', username: 'mika' },
    privacy: [{ section: 'animeList', visibility: 'friends' }],
    uploadError: { message: 'Storage quota' },
  })
  const repository = createProfileRepository(client)
  const publicProfile = await repository.getPublicProfile('mika', 'viewer-1')
  assert.equal(publicProfile.data.privacy.animeList, 'friends')
  const upload = await repository.uploadProfileImage('user-2', 'avatar', { name: 'avatar.jpg', type: 'image/jpeg', size: 100 })
  assert.equal(upload.data, null)
  assert.equal(upload.error, 'Storage quota')
})

test('rejects invalid remote profile images before Storage upload', async () => {
  const client = makeClient({ profile: { id: 'user-1', display_name: 'Andreh', username: 'andreh' } })
  const upload = await createProfileRepository(client).uploadProfileImage('user-1', 'avatar', { name: 'avatar.svg', type: 'image/svg+xml', size: 100 })
  assert.equal(upload.data, null)
  assert.match(upload.error, /imagen válida/i)
  assert.equal(client.calls.some((call) => call.type === 'from' && call.table === 'profile-media'), false)
})

test('uses a stable owner-scoped path for profile images', () => {
  assert.equal(buildProfileImagePath('user-1', 'avatar', 'portrait.PNG'), 'user-1/avatar.png')
  assert.equal(buildProfileImagePath('user-1', 'banner', 'cover.webp'), 'user-1/banner.webp')
})

test('does not resolve a private profile for an unrelated viewer', async () => {
  const client = makeClient({ profile: { id: 'user-2', display_name: 'Mika', username: 'mika', profile_visibility: 'private' } })
  const result = await createProfileRepository(client).getPublicProfile('mika', 'viewer-1')
  assert.equal(result.data, null)
  assert.equal(result.error, '')
})

test('loads and persists the account AnimeList through the remote repository', async () => {
  const client = makeClient({ profile: { id: 'user-1', display_name: 'Andreh', username: 'andreh' }, anime: [{ anime_id: '101', title: 'Frieren', genres: ['Fantasy', 'Drama'], status: 'watching', favorite: true }] })
  const repository = createProfileRepository(client)
  const own = await repository.getOwnProfile('user-1')
  assert.equal(own.data.animeList[0].id, '101')
  assert.deepEqual(own.data.animeList[0].genres, ['Fantasy', 'Drama'])
  const saved = await repository.saveAnimeList('user-1', own.data.animeList)
  assert.equal(saved.error, '')
  assert.equal(client.calls.some((call) => call.type === 'delete'), true)
  const animeUpsert = client.calls.find((call) => call.type === 'upsert')
  assert.deepEqual(animeUpsert.payload[0].genres, ['Fantasy', 'Drama'])
})

test('loads private lists and activity and writes new remote activity', async () => {
  const client = makeClient({
    profile: { id: 'user-1', display_name: 'Andreh', username: 'andreh' },
    lists: [{ list_id: 'list-1', title: 'Favoritos', description: '', accent: '#6d5cff', anime_ids: ['101'], created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' }],
    activity: [{ id: 'activity-1', type: 'profile', label: 'Actualizó su perfil', created_at: '2026-01-01T00:00:00.000Z' }],
  })
  const repository = createProfileRepository(client)
  const own = await repository.getOwnProfile('user-1')
  assert.equal(own.data.customLists[0].title, 'Favoritos')
  assert.equal(own.data.customLists[0].animeIds[0], '101')
  assert.equal(own.data.activity[0].label, 'Actualizó su perfil')
  const recorded = await repository.recordActivity('user-1', 'list', 'Creó una lista')
  assert.equal(recorded.error, '')
  assert.equal(recorded.data.label, 'Creó una lista')
})

test('persists avatarFrame, profileTheme, glassOpacity, and overviewOrder across remote save and load round-trip', async () => {
  let savedPayload = null
  const client = {
    calls: [],
    from(table) {
      if (table === 'profiles') {
        return {
          upsert(payload) {
            savedPayload = payload
            return {
              select() {
                return {
                  single() {
                    return Promise.resolve({ data: { ...payload, id: payload.id }, error: null })
                  }
                }
              }
            }
          },
          select() {
            return {
              eq() {
                return {
                  maybeSingle() {
                    return Promise.resolve({ data: savedPayload, error: null })
                  }
                }
              }
            }
          }
        }
      }
      if (table === 'profile_privacy') {
        return {
          select() { return this },
          eq() { return Promise.resolve({ data: [], error: null }) },
          upsert() { return Promise.resolve({ error: null }) }
        }
      }
      return {
        select() { return this },
        eq() { return this },
        order() { return this },
        then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) }
      }
    }
  }

  const repo = createProfileRepository(client)
  const saveResult = await repo.saveProfile('user-42', {
    username: 'andreh-pro',
    displayName: 'Andreh Master',
    avatarFrame: 'sakura',
    profileTheme: 'sakura-shrine',
    glassOpacity: 45,
    overviewOrder: ['comments', 'showcase', 'activity', 'animeList'],
    featuredQuote: 'Never give up',
    featuredReview: 'Masterpiece anime',
  })

  assert.equal(saveResult.error, '')
  assert.equal(saveResult.data.avatarFrame, 'sakura')
  assert.equal(saveResult.data.profileTheme, 'sakura-shrine')
  assert.equal(saveResult.data.glassOpacity, 45)
  assert.deepEqual(saveResult.data.overviewOrder, ['comments', 'showcase', 'activity', 'animeList'])
  assert.equal(saveResult.data.featuredQuote, 'Never give up')

  // Verificar que el payload hacia Supabase empaquetó las opciones en JSONB pinned_sections
  assert.equal(savedPayload.pinned_sections.avatarFrame, 'sakura')
  assert.equal(savedPayload.pinned_sections.profileTheme, 'sakura-shrine')
  assert.equal(savedPayload.pinned_sections.glassOpacity, 45)
  assert.deepEqual(savedPayload.pinned_sections.overviewOrder, ['comments', 'showcase', 'activity', 'animeList'])

  // Simular recarga remota en un navegador completamente nuevo (sin estado local)
  const loadedOnFreshBrowser = await repo.getOwnProfile('user-42')
  assert.equal(loadedOnFreshBrowser.error, '')
  assert.equal(loadedOnFreshBrowser.data.avatarFrame, 'sakura')
  assert.equal(loadedOnFreshBrowser.data.profileTheme, 'sakura-shrine')
  assert.equal(loadedOnFreshBrowser.data.glassOpacity, 45)
  assert.deepEqual(loadedOnFreshBrowser.data.overviewOrder, ['comments', 'showcase', 'activity', 'animeList'])
  assert.equal(loadedOnFreshBrowser.data.featuredQuote, 'Never give up')
  assert.equal(loadedOnFreshBrowser.data.featuredReview, 'Masterpiece anime')
})
