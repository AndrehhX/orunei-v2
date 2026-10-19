import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface VideoEngineProps {
  sourceUrl: string;
  isPlaying: boolean;
  playbackSpeed?: number;
  initialTime?: number;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onBuffering?: (isBuffering: boolean) => void;
}

export const VideoEngine: React.FC<VideoEngineProps> = ({
  sourceUrl,
  isPlaying,
  playbackSpeed = 1.0,
  initialTime = 0,
  onTimeUpdate,
  onEnded,
  onBuffering,
}) => {
  const videoRef = useRef<any>(null);

  // En plataformas Web, montamos un reproductor HTML5 real optimizado
  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current) {
      const v = videoRef.current;
      v.playbackRate = playbackSpeed;

      if (isPlaying) {
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    }
  }, [isPlaying, playbackSpeed, sourceUrl]);

  useEffect(() => {
    if (Platform.OS === 'web' && videoRef.current && initialTime > 0) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <video
          ref={videoRef}
          src={sourceUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000',
          }}
          playsInline
          autoPlay={isPlaying}
          onTimeUpdate={(e: any) => {
            const v = e.target;
            onTimeUpdate(v.currentTime, v.duration || 0);
          }}
          onEnded={onEnded}
          onWaiting={() => onBuffering?.(true)}
          onPlaying={() => onBuffering?.(false)}
        />
      </View>
    );
  }

  // Fallback nativo
  return (
    <View style={styles.container}>
      <View style={styles.nativeFallbackBackground} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  nativeFallbackBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#070809',
  },
});
