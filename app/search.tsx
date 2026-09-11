import { MovieBottomSheet } from '@/components/MovieBottomSheet';
import { MoviePosterCard } from '@/components/home/MoviePosterCard';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Movie, searchMovies } from '@/services/api';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, Search } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_SEARCH_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 1000;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);
  const canSearch = trimmedQuery.length >= MIN_SEARCH_CHARS;
  const cardWidth = useMemo(
    () => Math.floor((screenWidth - 40 - 2 * 10) / 3),
    [screenWidth]
  );
  const cardHeight = useMemo(() => Math.round(cardWidth * 1.49), [cardWidth]);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (!trimmedQuery) {
        setResults([]);
        setLoading(false);
        return;
      }

      if (!canSearch) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const movies = await searchMovies(trimmedQuery);
        setResults(movies);
      } catch (error) {
        console.error('Error searching movies:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(debounce);
  }, [trimmedQuery, canSearch]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'ios_from_right',
          contentStyle: { backgroundColor: '#000' },
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
            Buscar
          </Text>
        </View>

        <View style={styles.searchInputContainer}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder='Digite o nome de um filme...'
            rightComponent={<Search size={16} color='rgba(255,255,255,0.72)' />}
            returnKeyType='search'
            autoCapitalize='none'
          />
        </View>

        {loading ? (
          <FlatList
            data={Array.from({ length: 12 })}
            keyExtractor={(_, index) => `skeleton-${index}`}
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
            data={results}
            keyExtractor={(item, index) =>
              String(item.tmdbId || `${item.id}-${index}`)
            }
            numColumns={3}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item, index }) => (
              <MoviePosterCard
                movie={item}
                onPress={setSelectedMovie}
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
                  {!trimmedQuery
                    ? 'Busque por título para encontrar filmes.'
                    : !canSearch
                    ? 'Digite ao menos 3 caracteres.'
                    : 'Nenhum filme encontrado.'}
                </Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>

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
  searchInputContainer: {
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 20,
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
    paddingTop: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
});
