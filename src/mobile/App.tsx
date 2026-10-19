import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { App as CapApp } from '@capacitor/app';
import { MobileFrame } from './components/MobileFrame';
import { HeaderBar } from './components/HeaderBar';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeScreen } from './screens/HomeScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DetailScreen } from './screens/DetailScreen';
import { PlayerScreen } from './screens/PlayerScreen';
import { RootTab, AnimeItem } from './types/anime';
import { realAnimeService } from './services/realAnimeService';

const DEFAULT_ANIME: AnimeItem = {
  id: '154587',
  malId: 52991,
  title: "Frieren: Beyond Journey's End",
  originalTitle: '葬送のフリーレン',
  coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
  bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
  rating: 9.3,
  year: '2023',
  episodesCount: 28,
  genres: ['Adventure', 'Drama', 'Fantasy'],
  format: 'TV',
  isDubbed: true,
  synopsis: 'La maga elfa Frieren emprende una peregrinación para comprender la efímera vida humana.',
  studio: 'Madhouse',
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<RootTab>('inicio');
  const [currentView, setCurrentView] = useState<'tabs' | 'detail' | 'player'>('tabs');
  const [selectedAnime, setSelectedAnime] = useState<AnimeItem>(DEFAULT_ANIME);
  const [playingEpNumber, setPlayingEpNumber] = useState<number>(1);

  // Manejo del botón nativo "Atrás" de Android (Gestos del sistema y botón físico)
  useEffect(() => {
    let sub: any;
    try {
      CapApp.addListener('backButton', () => {
        if (currentView === 'player') {
          setCurrentView('detail');
        } else if (currentView === 'detail') {
          setCurrentView('tabs');
        } else if (currentTab !== 'inicio') {
          setCurrentTab('inicio');
        } else {
          CapApp.exitApp();
        }
      }).then((handle) => {
        sub = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (sub?.remove) sub.remove();
    };
  }, [currentView, currentTab]);

  const handleSelectAnime = (anime: AnimeItem) => {
    setSelectedAnime(anime);
    setCurrentView('detail');
  };

  const handlePlayEpisode = (anime: AnimeItem, epNumber: number) => {
    setSelectedAnime(anime);
    setPlayingEpNumber(epNumber);
    setCurrentView('player');
  };

  const handlePlayResume = async (animeId: string | number, epNumber: number) => {
    try {
      const detail = await realAnimeService.getAnimeDetail(animeId);
      if (detail?.anime) {
        handlePlayEpisode(detail.anime, epNumber);
        return;
      }
    } catch (_) {}
    handlePlayEpisode(selectedAnime, epNumber);
  };

  return (
    <MobileFrame>
      <div className="w-full h-full flex flex-col relative overflow-hidden bg-surface text-on-surface">
        <AnimatePresence mode="wait">
          {currentView === 'tabs' && (
            <motion.div
              key="tabs-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col w-full h-full relative overflow-hidden"
            >
              <HeaderBar
                onSearchPress={() => setCurrentTab('catalogo')}
                onProfilePress={() => setCurrentTab('perfil')}
              />

              <main className="flex-1 overflow-hidden relative flex flex-col">
                <div className={`w-full h-full flex flex-col overflow-hidden ${currentTab === 'inicio' ? '' : 'hidden'}`}>
                  <HomeScreen
                    onSelectAnime={handleSelectAnime}
                    onPlayEpisode={handlePlayEpisode}
                  />
                </div>
                <div className={`w-full h-full flex flex-col overflow-hidden ${currentTab === 'catalogo' ? '' : 'hidden'}`}>
                  <CatalogScreen onSelectAnime={handleSelectAnime} />
                </div>
                <div className={`w-full h-full flex flex-col overflow-hidden ${currentTab === 'favoritos' ? '' : 'hidden'}`}>
                  <FavoritesScreen
                    onSelectAnime={handleSelectAnime}
                    onExploreCatalog={() => setCurrentTab('catalogo')}
                  />
                </div>
                <div className={`w-full h-full flex flex-col overflow-hidden ${currentTab === 'perfil' ? '' : 'hidden'}`}>
                  <ProfileScreen onPlayResume={handlePlayResume} />
                </div>
              </main>

              <BottomNavBar
                currentTab={currentTab}
                onSelectTab={(tab) => setCurrentTab(tab)}
              />
            </motion.div>
          )}

          {currentView === 'detail' && (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col w-full h-full relative overflow-hidden"
            >
              <DetailScreen
                anime={selectedAnime}
                onBack={() => setCurrentView('tabs')}
                onPlayEpisode={handlePlayEpisode}
              />
            </motion.div>
          )}

          {currentView === 'player' && (
            <motion.div
              key="player-view"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col w-full h-full relative overflow-hidden bg-black"
            >
              <PlayerScreen
                anime={selectedAnime}
                episodeNumber={playingEpNumber}
                onBack={() => setCurrentView('detail')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileFrame>
  );
}
