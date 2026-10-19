/**
 * Orunei Mobile - Servicio de Datos y Catálogo Oficial
 * Imágenes cinematográficas de alta fidelidad extraídas directamente de Stitch
 */
import { AnimeItem, EpisodeItem, StreamSource } from '../types/anime';

export const FEATURED_HERO: AnimeItem = {
  id: 'frieren-beyond-journeys-end',
  malId: 52991,
  title: "Frieren: Beyond Journey's End",
  originalTitle: '葬送のフリーレン',
  coverImage:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuADIUC1TYD6FU-lGw-0huVybb_RfkU3Eabd7jb0jsmjcqjZbZGpFClGD6kybmuzFwY9IBrDpOZWd1gEJBHT4YPJ-l_NvMs1A1AZK6qOlcbPk6AD-lODzsPdKIqK6dK-Syq9SzmbrjRHerCYiougDZrLhAnX8B7UNmlBOYSwVokGFcRiC4qhg1TDqJ2iPT4aKM15Ms2JPUdmii9C97KIkXBTHE2akkmUv_Rs9v6wexIQ4LKpEGfq_DA',
  bannerImage:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuADIUC1TYD6FU-lGw-0huVybb_RfkU3Eabd7jb0jsmjcqjZbZGpFClGD6kybmuzFwY9IBrDpOZWd1gEJBHT4YPJ-l_NvMs1A1AZK6qOlcbPk6AD-lODzsPdKIqK6dK-Syq9SzmbrjRHerCYiougDZrLhAnX8B7UNmlBOYSwVokGFcRiC4qhg1TDqJ2iPT4aKM15Ms2JPUdmii9C97KIkXBTHE2akkmUv_Rs9v6wexIQ4LKpEGfq_DA',
  rating: 9.4,
  year: '2023–2024',
  episodesCount: 28,
  genres: ['Fantasía', 'Aventura', 'Drama'],
  format: 'TV',
  isDubbed: true,
  isSimulcast: true,
  synopsis:
    'Tras derrotar al Rey Demonio junto a su grupo heroico, la maga elfa emprende una peregrinación solitaria para descifrar el verdadero valor de los lazos humanos.',
  studio: 'Madhouse',
  director: 'Keiichirō Saitō',
  currentProgress: {
    episodeNumber: 14,
    episodeTitle: 'Privilegio de los jóvenes',
    watchedSeconds: 765,
    totalSeconds: 1455,
    remainingMinutes: 11,
  },
};

export const CONTINUE_WATCHING: AnimeItem[] = [
  {
    id: 'jujutsu-kaisen-s2',
    malId: 40748,
    title: 'Jujutsu Kaisen T2',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmwXCWNuJI6Lp5xo2-CNZpULfetDpFN-7bQxTFIMKYnvSZ3wzLs7EK_24qJyKkp29GGVCERC3-mIrPj9vR7pXPJ-jiXl9ccVkhpOEW0yIqVNEI2hUHXWRccxFtU4jLuZfjLli_UOIm56c9jC-Z9Xm1xLWO77d_cOoub81uiNLG8Rnttl-p92viTTTSP9fp0qDp4LyAXM9BgOCKDFRooLg4kVAOK2h_9onoL0uCxa2OaXgsP_WKNmQ',
    genres: ['Acción', 'Sobrenatural'],
    rating: 8.8,
    isDubbed: true,
    currentProgress: {
      episodeNumber: 17,
      episodeTitle: 'Trueno y Sombras',
      watchedSeconds: 1080,
      totalSeconds: 1440,
      remainingMinutes: 6,
    },
  },
  {
    id: 'vinland-saga-s2',
    malId: 49387,
    title: 'Vinland Saga T2',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCexb-gmmvh92sEAJEr3kOoTgPkuLcfeo3LtStbnRvEBIslf2x54AiVuFf-WEoMSm9KG7cMqpXRBCBn8g-Ps-MnLFjtjiutz9WBqo8U_7HEGIsB6MN4gr6OH__ug2TvGcynzcqcu9AGFN4m22ZpEI-mANcWfB9Ff1YjEeWm8WhlFz_-OSiBXVynu9LCIn5XQ3oMyNNsdn_xn4E_mxkclgxxNVOEqQCJC8PM9txcg_QxG6YRWRwfCFE',
    genres: ['Aventura', 'Histórico'],
    rating: 8.9,
    isDubbed: true,
    currentProgress: {
      episodeNumber: 21,
      episodeTitle: 'Coraje y Cenizas',
      watchedSeconds: 600,
      totalSeconds: 1500,
      remainingMinutes: 14,
    },
  },
  {
    id: 'solo-leveling',
    malId: 52299,
    title: 'Solo Leveling',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpjCDqKStN_wxIMzYjFSpwx0KcX0kOcG2ZVcUPI1NeQtpnFwyMFdOyc9trw9rapdAB-DwFLYJUx8D34elCtqkKRO2WgFm2C9NR-w8ZV23F8yEvK9MzIQgqWH0atV5MhHH4mABM15Rxn3Ng3W5iZ39-KoCQ01rJBHgG2eCA1KyHBiwDBW7EZL-QQ0RsY3K8rJdHx9OH6BDYrxsvVhJlqTiy8O8oeAO6io-jlIXvOXkgFTeGxaG-fgY',
    genres: ['Acción', 'Fantasía'],
    rating: 8.6,
    isDubbed: true,
    currentProgress: {
      episodeNumber: 11,
      episodeTitle: 'Un Caballero que Custodia',
      watchedSeconds: 1260,
      totalSeconds: 1440,
      remainingMinutes: 3,
    },
  },
];

export const EDITORIAL_PICKS: AnimeItem[] = [
  {
    id: 'kaiju-no-8',
    malId: 52588,
    title: 'Kaiju No. 8',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBidTxoOX0tTdfu1szFZdxxJapLgXQRN3A8R2j2amUiIxCL_aMY5qREpC5lE_abV4lUWG-AoXc5sP7qczw-6pgfKWLroGH4EvFH9IVRHIhkhUfUhdc0prqrebeUtksc7BoiVvIVP-7FkoJR1we8IdyiSeBkrxAWUv3bIvIHkr0595q0bhbw1esA26E63A6yseMd7wj9ASIhnOWhMo2e3-2iV36yoSStANb2zpbTsuNo8k9FLqhaCJU',
    bannerImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBidTxoOX0tTdfu1szFZdxxJapLgXQRN3A8R2j2amUiIxCL_aMY5qREpC5lE_abV4lUWG-AoXc5sP7qczw-6pgfKWLroGH4EvFH9IVRHIhkhUfUhdc0prqrebeUtksc7BoiVvIVP-7FkoJR1we8IdyiSeBkrxAWUv3bIvIHkr0595q0bhbw1esA26E63A6yseMd7wj9ASIhnOWhMo2e3-2iV36yoSStANb2zpbTsuNo8k9FLqhaCJU',
    rating: 8.4,
    year: 2024,
    episodesCount: 12,
    genres: ['Acción', 'Ciencia Ficción'],
    isDubbed: true,
    isSimulcast: true,
    synopsis: 'Episodio 10 ya disponible en audio dual simultáneo con subtítulos verificados.',
  },
  {
    id: 'oshi-no-ko-s2',
    malId: 55791,
    title: 'Oshi no Ko T2',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDO-wL4ohh-csQgH0agUKZaIRA916EpsUqDD7Esov-w86HQHdCk36BmM9_Ryd_o6Fi6sGv7VFrhMymJtSSI3gi3NwVi2_8z6VEWsB4TlhejsKxz-HcYTVJm0DeiAlMq5qJZvZb_WAjLiFJBgAb95bbXtfuhIqPyZG2zYpk_UnZj31pcihWkBwufImkGoot84sB3KbZEzp_jYGCwYT9moc5jMJjTeS-8U5FA244qwTd09Z5biX6utbI',
    rating: 8.6,
    year: 2024,
    episodesCount: 13,
    genres: ['Drama', 'Misterio'],
    isDubbed: true,
    synopsis: 'Elenco hispano estrena arco 2.5D con doblaje semanal.',
  },
  {
    id: 'evangelion-rebuild',
    malId: 2759,
    title: 'Evangelion: 3.0+1.0',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAdXcRYdS-q3d3CjSng5O_hUgxuVwZ7uDu_IKvsCW9QLq1bsTD061eLaxsvPFNTvYmk_dPS3CybaANm6nK3ISTSFCegEpIfhKohGr444C8IsQk4HfgXmrNApUX9lxr6lG613RN-w4pot2hE64mPwphKZPEKGYGKlYHud-GqCjbxRblIKwAWjvGV8ByUEGkcJfxc_FeVz3VRrfIDF7635X1-laJCzhynM63P-NFp9ae-AkiibbRQ5sA',
    rating: 8.7,
    year: 2021,
    episodesCount: 1,
    genres: ['Mecha', 'Psicológico'],
    isDubbed: true,
    synopsis: 'Remasterización de audio multicanal y restauración visual.',
  },
];

export const LATINO_CATALOG: AnimeItem[] = [
  {
    id: 'chainsaw-man',
    malId: 44511,
    title: 'Chainsaw Man',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA_nqEhcK9IuY1Ud5wLKGjf5kK6DPWNrGW_eVL-uU0P6L86VDfb0cx-O38biVOFy952p4EkzOHQbkdRK2gg4EWRclq0NL0On3gyFoEFa5CBhYCI_AzPvPKmcWoWDBtXj6fB3dlDcLBGVgMe4EFJiPLXytIDuiYQBwfvz1clhE-lGbrZJgDnSQXG6NmnYqr24WwjvfQ147EYDRM4YWRkIM_HWcuZ1Xw936uAwGYruv-sGVq2FI1fGmk',
    rating: 8.9,
    year: 2022,
    episodesCount: 12,
    genres: ['Acción', 'Sobrenatural'],
    isDubbed: true,
  },
  {
    id: 'spy-x-family',
    malId: 50265,
    title: 'SPY x FAMILY',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCHthEm_4nnysCSUjn_HpT7i5rrQ1qjmQR9vubED1GM3j0-TI4-_Dwu74XOtCNwzVOC2nn0qp3Je2QIwBsMNzeGtictvNSs9h8zQGrCQk2oAHN3F81Y8LzBVzNb-WqSq-5_tOaX96iUlZ3vKXr5lJ0A6LSQwgVSVGLml9pS1URxPlVpKiinTUU-NS76ivl68R7sDCoMMowVRtgESww-WLUNZ6y502qsjy51fmuylwjk9y7CPukLjRU',
    rating: 8.8,
    year: 2022,
    episodesCount: 37,
    genres: ['Comedia', 'Espionaje'],
    isDubbed: true,
  },
  {
    id: 'demon-slayer',
    malId: 38000,
    title: 'Demon Slayer',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCxrY2CdmvUQBMtd_daQ-Qln45-XH2cZOOKTUMr3xTOVJcp9DyXIIRUdo4_XLpZIffRHbBh15IdCYeMUcL7RFj_O0OjyK07FTMXBBEK8eJCrMRI9L5_AatMjpyJBX8c1zgUerHIgoTptMN4vy3mKIgMLp8NgfpjyKDMv_idpMmN6PXO4f5_7SYP1PlkYj5ug_kUlz5aQjqEsKbMSE7rzReGAwp_OSgu1EakLD1fG90PcZfMCsr6HnA',
    rating: 9.1,
    year: 2019,
    episodesCount: 55,
    genres: ['Fantasía oscura', 'Shonen'],
    isDubbed: true,
  },
  {
    id: 'bleach-tybw',
    malId: 41467,
    title: 'Bleach: TYBW',
    coverImage:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD-Oigesom9T46ecFC2a0hjoAxN6ApFGy4hsc3lxzR20nJQRChsOdh3gytfSud6p-su8XcK2Y-fvqKysMCOhsEl23gsiI3nfbXOctOx9q7GdSZglnPqJIsnDl7sUGzX6_arxJ6rrXOwzHRw3D4wIcN2B_8n91ZYQytVe034WXg93nziMMmyNDzOJSP6X9WmjnSqFL6lTMcc_W5hp8lpoB8GoIYYrbHujvqEBL98X6mOPPBAOv0fTX0',
    rating: 9.0,
    year: 2022,
    episodesCount: 26,
    genres: ['Shonen', 'Sobrenatural'],
    isDubbed: true,
  },
];

export const FRIEREN_EPISODES: EpisodeItem[] = [
  {
    id: 'ep-14',
    number: 14,
    title: 'Privilegio de los jóvenes',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuADIUC1TYD6FU-lGw-0huVybb_RfkU3Eabd7jb0jsmjcqjZbZGpFClGD6kybmuzFwY9IBrDpOZWd1gEJBHT4YPJ-l_NvMs1A1AZK6qOlcbPk6AD-lODzsPdKIqK6dK-Syq9SzmbrjRHerCYiougDZrLhAnX8B7UNmlBOYSwVokGFcRiC4qhg1TDqJ2iPT4aKM15Ms2JPUdmii9C97KIkXBTHE2akkmUv_Rs9v6wexIQ4LKpEGfq_DA',
    durationSeconds: 1455,
    durationLabel: '24:15',
    airedDate: '15 Dic 2023',
    synopsis: 'El grupo llega a una aldea pacífica donde un anciano sacerdote les pide ayuda con un problema inusual.',
    progressPercent: 52,
    isCompleted: false,
  },
  {
    id: 'ep-13',
    number: 13,
    title: 'Aversión por los semejantes',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmwXCWNuJI6Lp5xo2-CNZpULfetDpFN-7bQxTFIMKYnvSZ3wzLs7EK_24qJyKkp29GGVCERC3-mIrPj9vR7pXPJ-jiXl9ccVkhpOEW0yIqVNEI2hUHXWRccxFtU4jLuZfjLli_UOIm56c9jC-Z9Xm1xLWO77d_cOoub81uiNLG8Rnttl-p92viTTTSP9fp0qDp4LyAXM9BgOCKDFRooLg4kVAOK2h_9onoL0uCxa2OaXgsP_WKNmQ',
    durationSeconds: 1440,
    durationLabel: '24:00',
    airedDate: '08 Dic 2023',
    synopsis: 'Sein reflexiona sobre su vocación y sus dudas antes de emprender viaje.',
    progressPercent: 100,
    isCompleted: true,
  },
  {
    id: 'ep-15',
    number: 15,
    title: 'El perfume de las flores',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCexb-gmmvh92sEAJEr3kOoTgPkuLcfeo3LtStbnRvEBIslf2x54AiVuFf-WEoMSm9KG7cMqpXRBCBn8g-Ps-MnLFjtjiutz9WBqo8U_7HEGIsB6MN4gr6OH__ug2TvGcynzcqcu9AGFN4m22ZpEI-mANcWfB9Ff1YjEeWm8WhlFz_-OSiBXVynu9LCIn5XQ3oMyNNsdn_xn4E_mxkclgxxNVOEqQCJC8PM9txcg_QxG6YRWRwfCFE',
    durationSeconds: 1460,
    durationLabel: '24:20',
    airedDate: '22 Dic 2023',
    synopsis: 'La búsqueda de una flor legendaria que una vez alegró a Himmel.',
    progressPercent: 0,
    isCompleted: false,
  },
  {
    id: 'ep-16',
    number: 16,
    title: 'Amigos de toda la vida',
    thumbnail:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBpjCDqKStN_wxIMzYjFSpwx0KcX0kOcG2ZVcUPI1NeQtpnFwyMFdOyc9trw9rapdAB-DwFLYJUx8D34elCtqkKRO2WgFm2C9NR-w8ZV23F8yEvK9MzIQgqWH0atV5MhHH4mABM15Rxn3Ng3W5iZ39-KoCQ01rJBHgG2eCA1KyHBiwDBW7EZL-QQ0RsY3K8rJdHx9OH6BDYrxsvVhJlqTiy8O8oeAO6io-jlIXvOXkgFTeGxaG-fgY',
    durationSeconds: 1450,
    durationLabel: '24:10',
    airedDate: '05 Ene 2024',
    synopsis: 'Una breve pausa en una fortaleza fronteriza revela recuerdos del pasado.',
    progressPercent: 0,
    isCompleted: false,
  },
];

export const MOCK_SERVERS: StreamSource[] = [
  {
    id: 'voe-direct-hd',
    name: 'VOE Direct HD',
    sourceName: 'VOE Direct',
    quality: '1080p FHD',
    proxiedStreamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isEmbed: false,
    pingMs: 18,
    language: 'latino',
    badgeLabel: 'ULTRA RÁPIDO',
    badgeType: 'fast',
  },
  {
    id: 'mp4upload-bluray',
    name: 'MP4Upload Bluray Source',
    sourceName: 'MP4Upload',
    quality: '1080p FHD',
    proxiedStreamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    isEmbed: false,
    pingMs: 34,
    language: 'latino',
    badgeLabel: 'DESCARGA DIRECTA',
    badgeType: 'direct',
  },
  {
    id: 'streamtape-mirror',
    name: 'StreamTape Mirror 02',
    sourceName: 'StreamTape',
    quality: '720p Adaptativo',
    proxiedStreamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    isEmbed: false,
    pingMs: 62,
    language: 'subtitulado',
    badgeLabel: 'BAJO CONSUMO',
    badgeType: 'backup',
  },
];
