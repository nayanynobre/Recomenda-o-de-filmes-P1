import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';
import { Movie } from '@/services/api';
import { StyleSheet, ScrollView } from 'react-native';
import { MoviePosterCard } from './home/MoviePosterCard';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  movies?: Movie[];
  userPrompt?: string;
  loadMoreCount?: number;
  conversationContext?: string;
  isFollowUp?: boolean;
}
interface ChatMessageProps {
  message: Message;
  onMoviePress?: (movie: Movie) => void;
}

export function ChatMessage({ message, onMoviePress }: ChatMessageProps) {
  const { text, isUser, movies } = message;
  const aiBg = useColor('card');
  const borderColor = useColor('border');

  return (
    <View style={[styles.container, isUser && styles.userContainer]}>
      <View style={[
        styles.bubble,
        { backgroundColor: isUser ? '#007AFF' : aiBg, borderColor },
        isUser && styles.userBubble
      ]}>
        <Text variant='body' style={[styles.text, isUser && styles.userText]}>{text}</Text>
      </View>
      
      {movies && movies.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.moviesScroll}
          contentContainerStyle={styles.moviesContent}
        >
          {movies.map((movie, index) => (
            <MoviePosterCard
              key={`${movie.tmdbId || movie.id}-${index}`}
              movie={movie}
              onPress={(selectedMovie) => onMoviePress?.(selectedMovie)}
              style={styles.movieCard}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  userBubble: {
    borderTopRightRadius: 4,
  },
  text: {
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  moviesScroll: {
    marginTop: 12,
  },
  moviesContent: {
    paddingRight: 20,
  },
  movieCard: {
    marginRight: 10,
  },
});
