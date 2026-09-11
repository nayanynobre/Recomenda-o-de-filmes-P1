import { HeroCarousel } from '@/components/home/HeroCarousel';
import { MovieRail } from '@/components/home/MovieRail';
import { MovieBottomSheet } from '@/components/MovieBottomSheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  HOME_CATEGORIES,
  HomeCategorySlug,
  getMoviesByGenre,
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  Movie,
} from '@/services/api';
import { TMDB_GENRES } from '@/services/catalog/tmdb';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EMPTY_SECTION_MOVIES: Record<HomeCategorySlug, Movie[]> = {
  top10: [],
  popular: [],
  'top-rated': [],
  action: [],
  comedy: [],
  horror: [],
  'science-fiction': [],
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const bottom = useBottomTabBarHeight();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const borderColor = useColor('border');
  const bgColor = useColor('background');
  const textColor = useColor('text');
  const mutedColor = useColor('textMuted');

  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [sectionMovies, setSectionMovies] =
    useState<Record<HomeCategorySlug, Movie[]>>(EMPTY_SECTION_MOVIES);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);

  const heroHeight = useMemo(
    () => Math.max(420, Math.min(screenHeight * 0.62, 560)),
    [screenHeight]
  );

  const loadHomeData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      setLoadingHome(true);
    }

    try {
      const [trending, popular, topRated, action, comedy, horror, sciFi] =
        await Promise.all([
          getTrendingMovies(forceRefresh),
          getPopularMovies(forceRefresh),
          getTopRatedMovies(forceRefresh),
          getMoviesByGenre(TMDB_GENRES.action, forceRefresh),
          getMoviesByGenre(TMDB_GENRES.comedy, forceRefresh),
          getMoviesByGenre(TMDB_GENRES.horror, forceRefresh),
          getMoviesByGenre(TMDB_GENRES.scienceFiction, forceRefresh),
        ]);

      setHeroMovies(
        trending.length > 0 ? trending.slice(0, 6) : popular.slice(0, 6)
      );

      setSectionMovies({
        top10: trending.slice(0, 10),
        popular,
        'top-rated': topRated,
        action,
        comedy,
        horror,
        'science-fiction': sciFi,
      });
    } catch (error) {
      console.error('Error loading Home data:', error);
      setHeroMovies([]);
      setSectionMovies(EMPTY_SECTION_MOVIES);
    } finally {
      setLoadingHome(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadHomeData(true);
    } finally {
      setRefreshing(false);
    }
  };

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerBgFrom = isDark ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
  const headerBgTo = isDark ? 'rgba(0,0,0,0.84)' : 'rgba(255,255,255,0.92)';
  const headerBorderFrom = isDark ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,0)';
  const headerBorderTo = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)';

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const progress = interpolate(scrollY.value, [0, 22], [0, 1], Extrapolation.CLAMP);

    return {
      backgroundColor: interpolateColor(
        progress,
        [0, 1],
        [headerBgFrom, headerBgTo]
      ),
      borderBottomColor: interpolateColor(
        progress,
        [0, 1],
        [headerBorderFrom, headerBorderTo]
      ),
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: bottom + 28,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loadingHome ? (
          <>
            <Skeleton width='100%' height={heroHeight} />
            <View style={styles.loadingRails}>
              {HOME_CATEGORIES.map((section) => (
                <View key={section.slug} style={styles.loadingSection}>
                  <Skeleton width={170} height={24} />
                  <View style={styles.loadingCardsRow}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton
                        key={`${section.slug}-${index}`}
                        width={118}
                        height={176}
                        style={styles.loadingCard}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <HeroCarousel
              movies={heroMovies}
              height={heroHeight}
              onMoviePress={setSelectedMovie}
            />

            <View style={[styles.railsContainer, { borderTopColor: borderColor, backgroundColor: bgColor }]}>
              {HOME_CATEGORIES.map((section) => (
                <MovieRail
                  key={section.slug}
                  title={section.title}
                  movies={sectionMovies[section.slug]}
                  showRanking={section.showRanking}
                  onMoviePress={setSelectedMovie}
                  onPressSeeAll={() =>
                    router.push({
                      pathname: '/category/[slug]',
                      params: { slug: section.slug },
                    })
                  }
                />
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>

      <Animated.View
        pointerEvents='box-none'
        style={[
          styles.headerOverlay,
          headerAnimatedStyle,
          { paddingTop: insets.top + 6 },
        ]}
      >
        <View style={styles.headerRow}>
          <Text variant='heading' style={[styles.headerTitle, { color: textColor }]}>
            ReelAI
          </Text>

          <TouchableOpacity
            style={[styles.searchButton, {
              backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)',
              borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.15)',
            }]}
            onPress={() => router.push('/search')}
            accessibilityRole='button'
            accessibilityLabel='Ir para busca de filmes'
          >
            <Search size={19} color={textColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <MovieBottomSheet
        movie={selectedMovie}
        isVisible={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  railsContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 18,
  },
  loadingRails: {
    paddingTop: 18,
  },
  loadingSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  loadingCardsRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  loadingCard: {
    marginRight: 10,
    borderRadius: 14,
  },
});
