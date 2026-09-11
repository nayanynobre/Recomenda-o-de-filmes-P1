import { MovieBottomSheet } from '@/components/MovieBottomSheet';
import { MoviePosterCard } from '@/components/home/MoviePosterCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import {
  getHomeCategoryBySlug,
  getMoviesByHomeCategory,
  HomeCategorySlug,
  isHomeCategorySlug,
  Movie,
} from '@/services/api';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GRID_SKELETON_COUNT = 15;

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug?: string | string[] }>();

  const slugValue = useMemo(
    () => (Array.isArray(slug) ? slug[0] : slug),
    [slug]
  );

  const categorySlug = useMemo<HomeCategorySlug | null>(() => {
    if (!slugValue || !isHomeCategorySlug(slugValue)) return null;
    return slugValue;
  }, [slugValue]);

  const category = useMemo(
    () => (categorySlug ? getHomeCategoryBySlug(categorySlug) : null),
    [categorySlug]
  );
  const cardWidth = useMemo(
    () => Math.floor((screenWidth - 40 - 2 * 10) / 3),
    [screenWidth]
  );
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.49), [cardWidth]);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const loadCategoryMovies = useCallback(
    async (forceRefresh = false) => {
      if (!categorySlug) {
        setMovies([]);
        setLoading(false);
        return;
      }

      if (!forceRefresh) {
        setLoading(true);
      }

      try {
        const categoryMovies = await getMoviesByHomeCategory(
          categorySlug,
          forceRefresh
        );
        setMovies(categoryMovies);
      } catch (error) {
        console.error('Error loading category movies:', error);
        setMovies([]);
      } finally {
        setLoading(false);
      }
    },
    [categorySlug]
  );

  useEffect(() => {
    loadCategoryMovies();
  }, [loadCategoryMovies]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCategoryMovies(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'ios_from_right',
          contentStyle: { backgroundColor: '#000' },
        }}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel='Voltar'
        >
          <ArrowLeft size={20} color='#fff' />
        </TouchableOpacity>
        <Text variant='title' style={styles.headerTitle}>
          {category?.title || 'Categoria'}
        </Text>
      </View>

      {loading ? (
        <FlatList
          data={Array.from({ length: GRID_SKELETON_COUNT })}
          keyExtractor={(_, index) => `category-skeleton-${index}`}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ index }) => (
            <Skeleton
              width={cardWidth}
              height={cardHeight}
              style={{
                ...styles.skeletonCard,
                marginRight: index % 3 === 2 ? 0 : 10,
              }}
            />
          )}
        />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item, index) => String(item.tmdbId || `${item.id}-${index}`)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item, index }) => (
            <MoviePosterCard
              movie={item}
              onPress={setSelectedMovie}
              rank={category?.showRanking ? index + 1 : undefined}
              width={cardWidth}
              height={cardHeight}
              style={{
                marginRight: index % 3 === 2 ? 0 : 10,
                marginBottom: 10,
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text variant='caption' style={styles.emptyText}>
                Nenhum filme disponível nessa categoria.
              </Text>
            </View>
          }
        />
      )}

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
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  skeletonCard: {
    marginBottom: 10,
    borderRadius: 14,
  },
  emptyState: {
    paddingTop: 36,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.72)',
  },
});
