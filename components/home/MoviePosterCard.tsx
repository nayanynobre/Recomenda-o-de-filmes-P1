import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Movie } from '@/services/api';
import { Image, StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface MoviePosterCardProps {
  movie: Movie;
  onPress: (movie: Movie) => void;
  rank?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function MoviePosterCard({
  movie,
  onPress,
  rank,
  width = 118,
  height = 176,
  style,
}: MoviePosterCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(movie)}
      activeOpacity={0.86}
      style={[styles.container, { width, height }, style]}
    >
      {movie.imageUrl ? (
        <Image source={{ uri: movie.imageUrl }} style={styles.poster} />
      ) : (
        <View style={styles.placeholder} />
      )}

      {rank ? (
        <View style={styles.rankBadge}>
          <Text variant='subtitle' style={styles.rankText}>
            {rank}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#202020',
  },
  rankBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 17,
  },
});
