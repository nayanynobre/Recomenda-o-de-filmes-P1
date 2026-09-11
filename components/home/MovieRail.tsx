import { View } from '@/components/ui/view';
import { Movie } from '@/services/api';
import { FlatList, StyleSheet } from 'react-native';

import { MoviePosterCard } from './MoviePosterCard';
import { SectionHeader } from './SectionHeader';

interface MovieRailProps {
  title: string;
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
  onPressSeeAll: () => void;
  showRanking?: boolean;
}

export function MovieRail({
  title,
  movies,
  onMoviePress,
  onPressSeeAll,
  showRanking = false,
}: MovieRailProps) {
  if (movies.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} onPressAction={onPressSeeAll} />
      <FlatList
        data={movies}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) =>
          String(item.tmdbId || item.id || `${title}-${index}`)
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <MoviePosterCard
            movie={item}
            onPress={onMoviePress}
            rank={showRanking ? index + 1 : undefined}
            style={styles.card}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingRight: 10,
  },
  card: {
    marginRight: 10,
  },
});
