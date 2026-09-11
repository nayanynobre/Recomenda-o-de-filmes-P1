export interface StreamingOption {
  name: string;
  link: string;
  type: string;
  logo?: string;
}

export interface MovieRecommendation {
  tmdbId: number;
  title: string;
  imageUrl: string;
}

export interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  year: number;
  releaseYear?: number;
  imageUrl: string;
  overview: string;
  genres: string[];
  rating: number;
  runtime: number;
  director?: string;
  actors?: string;
  awards?: string;
  streamingOptions: StreamingOption[];
  recommendations?: MovieRecommendation[];
}
