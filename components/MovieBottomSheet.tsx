import { getMovieDetails, Movie } from '@/services/api';
import { Image, StyleSheet, TouchableOpacity, View, Text as RNText, useColorScheme, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Clock, Calendar, Award, Users, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react-native';
import { useState, useEffect, useRef, useMemo } from 'react';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

interface StreamingOptionProps {
  option: any;
  cardColor: string;
  textColor: string;
  mutedColor: string;
  onPress: () => void;
}

function StreamingOptionItem({ option, cardColor, textColor, mutedColor, onPress }: StreamingOptionProps) {
  const [logoError, setLogoError] = useState(false);
  
  // Verificações de segurança
  if (!option || !option.name || option.name === 'Desconhecido') {
    return null;
  }
  
  const shouldUseFallback = logoError || !option.logo;
  
  return (
    <TouchableOpacity 
      style={[styles.streamingOption, { backgroundColor: cardColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {!shouldUseFallback ? (
        <Image
          source={{ uri: option.logo }}
          style={styles.streamingLogo}
          onError={() => setLogoError(true)}
        />
      ) : (
        <View style={[styles.streamingLogoFallback, { backgroundColor: mutedColor }]}>
          <RNText style={styles.streamingLogoText}>
            {option.name.charAt(0).toUpperCase()}
          </RNText>
        </View>
      )}
      <View style={styles.streamingInfo}>
        <RNText style={[styles.streamingName, { color: textColor }]} numberOfLines={1}>
          {option.name}
        </RNText>
        <RNText style={[styles.streamingType, { color: mutedColor }]} numberOfLines={1}>
          {option.type || 'Disponível'}
        </RNText>
      </View>
      <ExternalLink size={16} color={mutedColor} />
    </TouchableOpacity>
  );
}

interface MovieBottomSheetProps {
  movie: Movie | null;
  isVisible: boolean;
  onClose: () => void;
}

export function MovieBottomSheet({ movie, isVisible, onClose }: MovieBottomSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [movieData, setMovieData] = useState<Movie | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const snapPoints = useMemo(() => ['60%', '95%'], []);
  const cardColor = isDark ? '#1f1f1f' : '#f5f5f5';
  const mutedColor = isDark ? '#888' : '#666';
  const textColor = isDark ? '#fff' : '#000';
  const bgColor = isDark ? '#000' : '#fff';

  useEffect(() => {
    if (isVisible && movie) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
      setMovieData(null);
      setIsOverviewExpanded(false);
    }
  }, [isVisible, movie]);

  useEffect(() => {
    let isMounted = true;

    const loadDetails = async () => {
      if (!isVisible || !movie) return;

      setLoadingDetails(true);

      try {
        const details = await getMovieDetails(movie.tmdbId || movie.id);

        if (!isMounted) return;
        setMovieData(details || movie);
      } catch {
        if (!isMounted) return;
        setMovieData(movie);
      } finally {
        if (isMounted) {
          setLoadingDetails(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [isVisible, movie]);

  const currentMovie = movieData || movie;

  const shouldShowReadMore =
    currentMovie?.overview && currentMovie.overview.length > 200;
  const displayOverview = shouldShowReadMore && !isOverviewExpanded 
    ? currentMovie.overview.substring(0, 200) + '...'
    : currentMovie?.overview;

  const handleStreamingPress = async (link: string, serviceName: string) => {
    if (!link) return;
    
    try {
      let finalLink = link;
      
      // Para Netflix, tenta diferentes formatos
      if (serviceName === 'Netflix' && link.includes('netflix.com')) {
        // Remove /br/ se existir
        finalLink = link.replace('/br/', '/');
        
        // Tenta abrir o link específico primeiro
        const canOpen = await Linking.canOpenURL(finalLink);
        if (!canOpen) {
          // Se não conseguir, abre a homepage da Netflix
          finalLink = 'https://www.netflix.com/';
        }
      }
      
      await Linking.openURL(finalLink);
    } catch {
      // Fallback: tenta abrir homepage do serviço
      try {
        if (serviceName === 'Netflix') {
          await Linking.openURL('https://www.netflix.com/');
        } else if (serviceName === 'Prime Video') {
          await Linking.openURL('https://www.primevideo.com/');
        }
      } catch {
        // Silently fail
      }
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      containerStyle={{ zIndex: 9999 }}
      backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 26, borderTopRightRadius: 26 }}
      handleIndicatorStyle={{ backgroundColor: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.35)', position: 'absolute', top: 8, zIndex: 10 }}
      handleStyle={{ position: 'absolute', top: 0, width: '100%', zIndex: 10 }}
    >
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {currentMovie ? (
          <>
            <View style={styles.coverContainer}>
              {currentMovie.imageUrl ? (
                <Image source={{ uri: currentMovie.imageUrl }} style={styles.cover} />
              ) : null}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
                locations={[0, 0.5, 0.8, 1]}
                style={styles.coverGradient}
              >
                <RNText style={styles.coverTitle}>{currentMovie.title}</RNText>
                <View style={styles.coverMeta}>
                  {(currentMovie.releaseYear || currentMovie.year) ? (
                    <View style={styles.metaChip}>
                      <Calendar size={12} color="#fff" />
                      <RNText style={styles.metaChipText}>{currentMovie.releaseYear || currentMovie.year}</RNText>
                    </View>
                  ) : null}
                  {(currentMovie.runtime || 0) > 0 ? (
                    <View style={styles.metaChip}>
                      <Clock size={12} color="#fff" />
                      <RNText style={styles.metaChipText}>{currentMovie.runtime} min</RNText>
                    </View>
                  ) : null}
                  {(currentMovie.rating || 0) > 0 ? (
                    <View style={[styles.metaChip, styles.ratingChip]}>
                      <Star size={12} color="#FFD700" fill="#FFD700" />
                      <RNText style={styles.metaChipText}>{currentMovie.rating?.toFixed(1)}</RNText>
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
        </View>

        <View style={styles.content}>
          {(currentMovie.director || (currentMovie.awards && currentMovie.awards !== 'N/A')) ? (
            <View style={styles.quickInfo}>
              {currentMovie.director ? (
                <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
                  <Users size={16} color={mutedColor} />
                  <View style={styles.infoCardContent}>
                    <RNText style={[styles.infoCardLabel, { color: mutedColor }]}>Diretor</RNText>
                    <RNText style={[styles.infoCardValue, { color: textColor }]} numberOfLines={1}>{currentMovie.director}</RNText>
                  </View>
                </View>
              ) : null}
              {currentMovie.awards && currentMovie.awards !== 'N/A' ? (
                <View style={[styles.infoCard, { backgroundColor: cardColor }]}>
                  <Award size={16} color={mutedColor} />
                  <View style={styles.infoCardContent}>
                    <RNText style={[styles.infoCardLabel, { color: mutedColor }]}>Prêmios</RNText>
                    <RNText style={[styles.infoCardValue, { color: textColor }]} numberOfLines={1}>{currentMovie.awards.split('.')[0]}</RNText>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}

          {currentMovie.overview ? (
            <View style={styles.section}>
              <RNText style={[styles.sectionTitle, { color: textColor }]}>Sinopse</RNText>
              <RNText style={[styles.overview, { color: textColor }]}>{displayOverview}</RNText>
              {shouldShowReadMore ? (
                <TouchableOpacity 
                  onPress={() => setIsOverviewExpanded(!isOverviewExpanded)}
                  style={styles.readMoreButton}
                >
                  <RNText style={[styles.readMoreText, { color: mutedColor }]}>
                    {isOverviewExpanded ? 'Ler menos' : 'Ler mais'}
                  </RNText>
                  {isOverviewExpanded ? (
                    <ChevronUp size={16} color={mutedColor} />
                  ) : (
                    <ChevronDown size={16} color={mutedColor} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {currentMovie.actors ? (
            <View style={styles.section}>
              <RNText style={[styles.sectionTitle, { color: textColor }]}>Elenco Principal</RNText>
              <RNText style={[styles.detail, { color: textColor }]}>{currentMovie.actors}</RNText>
            </View>
          ) : null}
          
          {currentMovie.genres && currentMovie.genres.length > 0 ? (
            <View style={styles.section}>
              <RNText style={[styles.sectionTitle, { color: textColor }]}>Gêneros</RNText>
              <View style={styles.genres}>
                {currentMovie.genres.map((genre, idx) => (
                  <View key={idx} style={[styles.genreBadge, { backgroundColor: cardColor }]}>
                    <RNText style={[styles.genreText, { color: textColor }]}>
                      {genre}
                    </RNText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          
          <View style={styles.section}>
            <RNText style={[styles.sectionTitle, { color: textColor }]}>Onde Assistir</RNText>
            {loadingDetails ? (
              <View style={[styles.emptyState, { backgroundColor: cardColor }]}>
                <RNText style={[styles.emptyText, { color: mutedColor }]}>
                  Carregando detalhes...
                </RNText>
              </View>
            ) : currentMovie.streamingOptions && currentMovie.streamingOptions.length > 0 ? (
              <View style={styles.streamingOptions}>
                {currentMovie.streamingOptions.map((option, idx) => (
                  <StreamingOptionItem
                    key={idx}
                    option={option}
                    cardColor={cardColor}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    onPress={() => option.link && handleStreamingPress(option.link, option.name)}
                  />
                ))}
              </View>
            ) : (
              <View style={[styles.emptyState, { backgroundColor: cardColor }]}>
                <RNText style={[styles.emptyText, { color: mutedColor }]}>Informações de streaming não disponíveis</RNText>
              </View>
            )}
          </View>
        </View>
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 140,
  },
  coverContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  cover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '80%',
    justifyContent: 'flex-end',
    padding: 20,
  },
  coverTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  coverMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingChip: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  metaChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  quickInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    opacity: 0.6,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoCardValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  overview: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
  detail: {
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.7,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.3)',
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
  streamingOptions: {
    gap: 12,
  },
  streamingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  streamingLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    resizeMode: 'contain',
  },
  streamingLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamingLogoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  streamingInfo: {
    flex: 1,
  },
  streamingName: {
    fontSize: 14,
    fontWeight: '600',
  },
  streamingType: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
});
