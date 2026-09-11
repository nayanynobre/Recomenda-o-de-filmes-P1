import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { Movie, MovieRecommendation, StreamingOption } from './types';

const TMDB_BEARER_TOKEN = process.env.EXPO_PUBLIC_TMDB_BEARER_TOKEN || '';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hora
const DEFAULT_LANGUAGE = 'pt-BR';
const DEFAULT_REGION = 'BR';

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const TMDB_POSTER_SIZE = 'w500';
const TMDB_LOGO_SIZE = 'w185';

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenreListResponse {
  genres?: TmdbGenre[];
}

interface TmdbMovieListResponse {
  results?: any[];
}

interface TmdbCreditsResponse {
  crew?: { job?: string; name?: string }[];
  cast?: { name?: string }[];
}

const tmdbApi = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  headers: {
    accept: 'application/json',
    ...(TMDB_BEARER_TOKEN
      ? { Authorization: `Bearer ${TMDB_BEARER_TOKEN}` }
      : {}),
  },
});

export const TMDB_GENRES = {
  action: 28,
  comedy: 35,
  horror: 27,
  scienceFiction: 878,
} as const;

let hasWarnedMissingToken = false;

function ensureTmdbToken() {
  if (!TMDB_BEARER_TOKEN) {
    if (!hasWarnedMissingToken) {
      hasWarnedMissingToken = true;
      console.error(
        'TMDB bearer token missing. Set EXPO_PUBLIC_TMDB_BEARER_TOKEN in .env'
      );
    }
    return false;
  }

  return true;
}

async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);

    if (cached) {
      const { data, timestamp } = JSON.parse(cached);

      if (Date.now() - timestamp < CACHE_EXPIRY) {
        return data as T;
      }
    }
  } catch (error) {
    console.error('TMDB cache read error:', error);
  }

  return null;
}

async function setCachedData(key: string, data: unknown) {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (error) {
    console.error('TMDB cache write error:', error);
  }
}

function getImageUrl(path?: string | null, size = TMDB_POSTER_SIZE) {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

function parseReleaseYear(releaseDate?: string | null) {
  if (!releaseDate) return 0;
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isNaN(year) ? 0 : year;
}

function mapWatchType(key: string) {
  if (key === 'flatrate') return 'Streaming';
  if (key === 'rent') return 'Aluguel';
  if (key === 'buy') return 'Compra';
  if (key === 'free') return 'Grátis';
  return 'Disponível';
}

function parseStreamingOptions(watchProvidersData: any): StreamingOption[] {
  const results = watchProvidersData?.results || {};
  const regionData =
    results[DEFAULT_REGION] ||
    results.US ||
    (Object.values(results)[0] as any) ||
    null;

  if (!regionData) return [];

  const link = regionData.link || '';
  const providerGroups = ['flatrate', 'rent', 'buy', 'free'] as const;
  const uniqueOptions = new Map<string, StreamingOption>();

  providerGroups.forEach((groupKey) => {
    const providers = regionData[groupKey] || [];

    providers.forEach((provider: any) => {
      const providerName = provider?.provider_name;

      if (!providerName) return;

      const type = mapWatchType(groupKey);
      const uniqueKey = `${providerName}-${type}`;

      if (uniqueOptions.has(uniqueKey)) return;

      uniqueOptions.set(uniqueKey, {
        name: providerName,
        link,
        type,
        logo: getImageUrl(provider?.logo_path, TMDB_LOGO_SIZE),
      });
    });
  });

  return Array.from(uniqueOptions.values());
}

function mapRecommendations(results: any[]): MovieRecommendation[] {
  return (results || []).slice(0, 10).map((item) => ({
    tmdbId: item.id,
    title: item.title || '',
    imageUrl:
      getImageUrl(item.poster_path) ||
      getImageUrl(item.backdrop_path) ||
      '',
  }));
}

function parseMovie(
  item: any,
  genresMap: Record<number, string>,
  extra?: {
    director?: string;
    actors?: string;
    runtime?: number;
    streamingOptions?: StreamingOption[];
    recommendations?: MovieRecommendation[];
  }
): Movie {
  const genreNames = Array.isArray(item?.genres)
    ? item.genres
        .map((genre: any) => genre?.name)
        .filter((name: string | undefined) => Boolean(name))
    : Array.isArray(item?.genre_ids)
    ? item.genre_ids
        .map((genreId: number) => genresMap[genreId])
        .filter((name: string | undefined) => Boolean(name))
    : [];

  const year = parseReleaseYear(item?.release_date);
  const tmdbId = Number(item?.id || 0);
  const runtime = Number(extra?.runtime ?? item?.runtime ?? 0);
  const rating = Number(item?.vote_average ?? 0);

  return {
    id: String(tmdbId),
    tmdbId,
    title: item?.title || '',
    year,
    releaseYear: year,
    imageUrl:
      getImageUrl(item?.poster_path) ||
      getImageUrl(item?.backdrop_path) ||
      '',
    overview: item?.overview || '',
    genres: genreNames as string[],
    rating,
    runtime: Number.isNaN(runtime) ? 0 : runtime,
    director: extra?.director || '',
    actors: extra?.actors || '',
    awards: '',
    streamingOptions: extra?.streamingOptions || [],
    recommendations: extra?.recommendations,
  };
}

async function getGenresMap(forceRefresh = false): Promise<Record<number, string>> {
  const cacheKey = 'tmdb_genres_map';

  if (!forceRefresh) {
    const cached = await getCachedData<Record<number, string>>(cacheKey);
    if (cached) return cached;
  }

  const response = await tmdbApi.get<TmdbGenreListResponse>('/genre/movie/list', {
    params: {
      language: DEFAULT_LANGUAGE,
      region: DEFAULT_REGION,
    },
  });

  const genres = response.data?.genres || [];
  const map: Record<number, string> = {};

  genres.forEach((genre) => {
    map[genre.id] = genre.name;
  });

  await setCachedData(cacheKey, map);
  return map;
}

async function fetchMovieCollection(
  cacheKey: string,
  endpoint: string,
  params: Record<string, unknown>,
  forceRefresh = false
): Promise<Movie[]> {
  if (!ensureTmdbToken()) return [];

  if (!forceRefresh) {
    const cached = await getCachedData<Movie[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    const [genresMap, response] = await Promise.all([
      getGenresMap(forceRefresh),
      tmdbApi.get<TmdbMovieListResponse>(endpoint, {
        params: {
          language: DEFAULT_LANGUAGE,
          region: DEFAULT_REGION,
          page: 1,
          ...params,
        },
      }),
    ]);

    const results = response.data?.results || [];
    const movies = results.slice(0, 20).map((item: any) => parseMovie(item, genresMap));

    await setCachedData(cacheKey, movies);
    return movies;
  } catch (error) {
    console.error(`TMDB collection fetch failed (${endpoint}):`, error);
    return [];
  }
}

export async function fetchPopularMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchMovieCollection('tmdb_popular_movies', '/movie/popular', {}, forceRefresh);
}

export async function fetchTopRatedMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchMovieCollection('tmdb_top_rated_movies', '/movie/top_rated', {}, forceRefresh);
}

export async function fetchTrendingMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchMovieCollection('tmdb_trending_movies', '/trending/movie/week', {}, forceRefresh);
}

export async function fetchMoviesByGenre(
  genreId: number,
  forceRefresh = false
): Promise<Movie[]> {
  return fetchMovieCollection(
    `tmdb_genre_${genreId}`,
    '/discover/movie',
    {
      with_genres: String(genreId),
      sort_by: 'popularity.desc',
      include_adult: false,
      include_video: false,
    },
    forceRefresh
  );
}

export async function fetchMoviesBySearch(query: string): Promise<Movie[]> {
  if (!ensureTmdbToken()) return [];

  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const cacheKey = `tmdb_search_${normalizedQuery.toLowerCase()}`;
  const cached = await getCachedData<Movie[]>(cacheKey);

  if (cached) return cached;

  try {
    const [genresMap, response] = await Promise.all([
      getGenresMap(false),
      tmdbApi.get<TmdbMovieListResponse>('/search/movie', {
        params: {
          query: normalizedQuery,
          language: DEFAULT_LANGUAGE,
          region: DEFAULT_REGION,
          include_adult: false,
          page: 1,
        },
      }),
    ]);

    const results = response.data?.results || [];
    const movies = results.slice(0, 20).map((item: any) => parseMovie(item, genresMap));

    await setCachedData(cacheKey, movies);
    return movies;
  } catch (error) {
    console.error('TMDB search failed:', error);
    return [];
  }
}

export async function fetchMovieDetailsByTmdbId(
  movieId: string | number,
  forceRefresh = false
): Promise<Movie | null> {
  if (!ensureTmdbToken()) return null;

  const tmdbId = Number(movieId);
  if (Number.isNaN(tmdbId) || tmdbId <= 0) return null;

  const cacheKey = `tmdb_movie_${tmdbId}`;

  if (!forceRefresh) {
    const cached = await getCachedData<Movie>(cacheKey);
    if (cached) return cached;
  }

  try {
    const [genresMap, details, credits, recommendations, watchProviders] =
      await Promise.all([
        getGenresMap(forceRefresh),
        tmdbApi.get<any>(`/movie/${tmdbId}`, {
          params: {
            language: DEFAULT_LANGUAGE,
            region: DEFAULT_REGION,
          },
        }),
        tmdbApi.get<TmdbCreditsResponse>(`/movie/${tmdbId}/credits`, {
          params: {
            language: DEFAULT_LANGUAGE,
            region: DEFAULT_REGION,
          },
        }),
        tmdbApi.get<TmdbMovieListResponse>(`/movie/${tmdbId}/recommendations`, {
          params: {
            language: DEFAULT_LANGUAGE,
            region: DEFAULT_REGION,
            page: 1,
          },
        }),
        tmdbApi.get<any>(`/movie/${tmdbId}/watch/providers`),
      ]);

    const director =
      credits.data?.crew?.find((person: any) => person.job === 'Director')
        ?.name || '';
    const actors = (credits.data?.cast || [])
      .slice(0, 5)
      .map((actor: any) => actor?.name)
      .filter(Boolean)
      .join(', ');

    const movie = parseMovie(details.data, genresMap, {
      director,
      actors,
      runtime: details.data?.runtime || 0,
      streamingOptions: parseStreamingOptions(watchProviders.data),
      recommendations: mapRecommendations(recommendations.data?.results || []),
    });

    await setCachedData(cacheKey, movie);
    return movie;
  } catch (error) {
    console.error('TMDB movie details failed:', error);
    return null;
  }
}
