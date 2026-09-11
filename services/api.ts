import {
  TMDB_GENRES,
  fetchMovieDetailsByTmdbId,
  fetchMoviesByGenre,
  fetchMoviesBySearch,
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchTrendingMovies,
} from '@/services/catalog/tmdb';
import type {
  Movie,
  MovieRecommendation,
  StreamingOption,
} from '@/services/catalog/types';

export type { Movie, MovieRecommendation, StreamingOption };

export type HomeCategorySlug =
  | 'top10'
  | 'popular'
  | 'top-rated'
  | 'action'
  | 'comedy'
  | 'horror'
  | 'science-fiction';

export interface HomeCategory {
  slug: HomeCategorySlug;
  title: string;
  showRanking?: boolean;
}

export const HOME_CATEGORIES: HomeCategory[] = [
  { slug: 'top10', title: 'Top 10 filmes', showRanking: true },
  { slug: 'popular', title: 'Populares' },
  { slug: 'top-rated', title: 'Mais bem avaliados' },
  { slug: 'action', title: 'Ação' },
  { slug: 'comedy', title: 'Comédia' },
  { slug: 'horror', title: 'Terror' },
  { slug: 'science-fiction', title: 'Ficção científica' },
];

export function isHomeCategorySlug(value: string): value is HomeCategorySlug {
  return HOME_CATEGORIES.some((category) => category.slug === value);
}

export function getHomeCategoryBySlug(slug: HomeCategorySlug): HomeCategory {
  return (
    HOME_CATEGORIES.find((category) => category.slug === slug) ??
    HOME_CATEGORIES[0]
  );
}

export async function getPopularMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchPopularMovies(forceRefresh);
}

export async function getTopRatedMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchTopRatedMovies(forceRefresh);
}

export async function getTrendingMovies(forceRefresh = false): Promise<Movie[]> {
  return fetchTrendingMovies(forceRefresh);
}

export async function getMoviesByGenre(
  genreId: number,
  forceRefresh = false
): Promise<Movie[]> {
  return fetchMoviesByGenre(genreId, forceRefresh);
}

export async function getMovieDetails(
  movieId: string | number,
  forceRefresh = false
): Promise<Movie | null> {
  return fetchMovieDetailsByTmdbId(movieId, forceRefresh);
}

export async function searchMovies(query: string): Promise<Movie[]> {
  return fetchMoviesBySearch(query);
}

export async function getMoviesByHomeCategory(
  slug: HomeCategorySlug,
  forceRefresh = false
): Promise<Movie[]> {
  switch (slug) {
    case 'top10': {
      const trending = await fetchTrendingMovies(forceRefresh);
      return trending.slice(0, 10);
    }
    case 'popular':
      return fetchPopularMovies(forceRefresh);
    case 'top-rated':
      return fetchTopRatedMovies(forceRefresh);
    case 'action':
      return fetchMoviesByGenre(TMDB_GENRES.action, forceRefresh);
    case 'comedy':
      return fetchMoviesByGenre(TMDB_GENRES.comedy, forceRefresh);
    case 'horror':
      return fetchMoviesByGenre(TMDB_GENRES.horror, forceRefresh);
    case 'science-fiction':
      return fetchMoviesByGenre(TMDB_GENRES.scienceFiction, forceRefresh);
    default:
      return [];
  }
}

// Compatibilidade temporária com chamadas antigas (Home antiga).
export async function getTopMoviesByService(
  _service: string,
  forceRefresh = false
): Promise<Movie[]> {
  return fetchTrendingMovies(forceRefresh);
}
