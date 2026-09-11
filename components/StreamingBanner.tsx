import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useColor } from '@/hooks/useColor';
import { Movie } from '@/services/api';
import { StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface StreamingBannerProps {
  service: string;
  movies: Movie[];
  onMoviePress: (movie: Movie) => void;
  index: number; // Para alternar o layout
}

export function StreamingBanner({ service, movies, onMoviePress, index }: StreamingBannerProps) {
  const borderColor = useColor('border');

  // Service-specific sophisticated dark gradients
  const getServiceConfig = (service: string, bannerIndex: number) => {
    const isTextLeft = bannerIndex % 2 === 0; // Alterna lado do texto
    
    const configs = {
      netflix: {
        name: 'Netflix',
        icon: '🎬',
        gradients: isTextLeft 
          ? ['#0F0F23', '#1A1A2E', '#16213E'] // Texto à esquerda - azul escuro
          : ['#2D1B69', '#0F0F23', '#1A1A2E'] // Texto à direita - roxo escuro
      },
      amazon: {
        name: 'Prime Video', 
        icon: '📺',
        gradients: isTextLeft
          ? ['#1A1A1A', '#2D2D2D', '#3D3D3D'] // Texto à esquerda - cinza escuro
          : ['#2D1B1A', '#1A1A1A', '#2D2D2D'] // Texto à direita - marrom escuro
      },
      apple: {
        name: 'Apple TV+',
        icon: '🍎', 
        gradients: isTextLeft
          ? ['#0D0D0D', '#1A1A1A', '#2D2D2D'] // Texto à esquerda - preto elegante
          : ['#2D2D2D', '#0D0D0D', '#1A1A1A'] // Texto à direita - cinza elegante
      }
    };
    
    return {
      ...configs[service as keyof typeof configs] || configs.apple,
      isTextLeft,
      shadowColor: '#000000'
    };
  };

  const config = getServiceConfig(service, index);
  const [primaryGradient, secondaryGradient, accentGradient] = config.gradients;

  return (
    <View style={[styles.container, { borderColor }]}>
      <LinearGradient
        colors={config.gradients as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={[styles.content, config.isTextLeft ? styles.textLeft : styles.textRight]}>
          
          {/* Lado do Texto */}
          <View style={[styles.textSection, config.isTextLeft ? styles.textLeft : styles.textRight]}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>{config.icon}</Text>
               <View style={styles.serviceText}>
                 <Text style={styles.serviceName}>Top 5 filmes do</Text>
                 <Text style={styles.serviceTitle}>{config.name}</Text>
               </View>
            </View>
            
            <View style={styles.description}>
              <Text style={styles.descriptionText}>
                {config.name === 'Netflix' && 'Os maiores sucessos da plataforma líder em streaming'}
                {config.name === 'Prime Video' && 'Produções exclusivas e blockbusters imperdíveis'}
                {config.name === 'Apple TV+' && 'Conteúdo original premium com qualidade cinematográfica'}
              </Text>
            </View>
          </View>

          {/* Lado dos Cards Escalonados */}
          <View style={styles.cardsSection}>
            <View style={styles.cardsStack}>
              {movies.slice(0, 3).map((movie, movieIndex) => (
                <TouchableOpacity 
                  key={`${movie.id}-${movieIndex}`} 
                  onPress={() => onMoviePress(movie)}
                  style={[
                    styles.movieCardStacked,
                    movieIndex === 1 && styles.centerCard, // Card principal no centro
                    movieIndex === 0 && styles.backCardLeft,
                    movieIndex === 2 && styles.backCardRight
                  ]}
                >
                  {movie.imageUrl ? (
                    <Image source={{ uri: movie.imageUrl }} style={styles.movieImageStacked} />
                  ) : (
                    <View style={styles.moviePlaceholderStacked}>
                      <Text style={styles.placeholderIcon}>🎬</Text>
                    </View>
                  )}
                  
                  {/* Overlay com gradiente e informações */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    locations={[0, 1]}
                    style={styles.movieOverlayStacked}
                  >
                    <Text style={styles.movieTitleStacked} numberOfLines={2}>
                      {movie.title}
                    </Text>
                    <Text style={styles.movieYearStacked}>
                      {movie.releaseYear || movie.year}
                    </Text>
                  </LinearGradient>

                  {/* Elementos decorativos */}
                  <View style={styles.cardDecorations}>
                    {movieIndex === 1 && (
                      <Text style={styles.crown}>👑</Text>
                    )}
                    {movieIndex === 0 && (
                      <Text style={styles.starDecoration}>⭐</Text>
                    )}
                    {movieIndex === 2 && (
                      <Text style={styles.flameDecoration}>🔥</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
   container: {
     width: width - 40,
     height: 200,
     borderRadius: 24,
     borderWidth: 1,
     overflow: 'hidden',
     marginBottom: 20,
     marginHorizontal: 20,
     alignSelf: 'center',
   },
  gradient: {
    flex: 1,
  },
   content: {
     flex: 1,
     paddingHorizontal: 20,
     paddingVertical: 16,
     alignItems: 'center',
     justifyContent: 'center',
   },
  textLeft: {
    flexDirection: 'row',
  },
  textRight: {
    flexDirection: 'row-reverse',
  },
   textSection: {
     flex: 1,
     justifyContent: 'center',
     paddingRight: 12,
     maxWidth: '45%',
   },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  serviceText: {
    flex: 1,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  description: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 16,
  },
   cardsSection: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     maxWidth: '45%',
   },
   cardsStack: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     height: 140,
     position: 'relative',
   },
  movieCardStacked: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
   centerCard: {
     width: 85,
     height: 125,
     zIndex: 3,
     transform: [{ scale: 1.05 }],
   },
   backCardLeft: {
     width: 75,
     height: 110,
     left: -20,
     zIndex: 1,
     transform: [{ scale: 0.85 }, { rotate: '-6deg' }],
   },
   backCardRight: {
     width: 75,
     height: 110,
     right: -20,
     zIndex: 1,
     transform: [{ scale: 0.85 }, { rotate: '6deg' }],
   },
  movieImageStacked: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moviePlaceholderStacked: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.5)',
  },
  movieOverlayStacked: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 6,
  },
  movieTitleStacked: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  movieYearStacked: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.8)',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDecorations: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 5,
  },
  crown: {
    fontSize: 16,
  },
  starDecoration: {
    fontSize: 14,
  },
  flameDecoration: {
    fontSize: 14,
  },
});
