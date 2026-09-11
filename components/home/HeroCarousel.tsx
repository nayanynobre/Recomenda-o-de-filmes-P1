import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Movie } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';

interface HeroCarouselProps {
  movies: Movie[];
  height: number;
  onMoviePress: (movie: Movie) => void;
}

const AUTO_PLAY_DELAY_MS = 5000;

export function HeroCarousel({ movies, height, onMoviePress }: HeroCarouselProps) {
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList<Movie>>(null);
  const activeIndexRef = useRef(0);
  const isDraggingRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const heroMovies = useMemo(() => movies.slice(0, 6), [movies]);
  const canAutoPlay = heroMovies.length > 1;

  useEffect(() => {
    if (!canAutoPlay) return;

    const timer = setInterval(() => {
      if (isDraggingRef.current) return;

      const nextIndex = (activeIndexRef.current + 1) % heroMovies.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, AUTO_PLAY_DELAY_MS);

    return () => clearInterval(timer);
  }, [canAutoPlay, heroMovies.length]);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    isDraggingRef.current = false;
  };

  return (
    <View style={[styles.container, { height }]}>
      <FlatList
        ref={flatListRef}
        data={heroMovies}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => String(item.tmdbId || `${item.id}-${index}`)}
        onScrollBeginDrag={() => {
          isDraggingRef.current = true;
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.slide, { width, height }]}
            onPress={() => onMoviePress(item)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} />
            ) : (
              <View style={styles.imageFallback} />
            )}

            <LinearGradient
              colors={[
                'rgba(0,0,0,0.12)',
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.86)',
                '#000000',
              ]}
              locations={[0, 0.48, 0.78, 1]}
              style={styles.overlay}
            >
              <View style={styles.content}>
                <Text variant='caption' style={styles.kicker}>
                  EM DESTAQUE
                </Text>
                <Text variant='heading' style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      <View style={styles.dotsRow}>
        {heroMovies.map((movie, index) => (
          <View
            key={String(movie.tmdbId || `${movie.id}-dot-${index}`)}
            style={[
              styles.dot,
              index === activeIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  slide: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1c1c1e',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: 'flex-end',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 54,
  },
  kicker: {
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 11,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800',
    maxWidth: '85%',
  },
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 18,
    borderRadius: 999,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
