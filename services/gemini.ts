import { GoogleGenAI, Type } from '@google/genai';
import { searchMovies, Movie } from './api';
import type { RecommendationContext } from './chatContext';
import { getBackendRecommendations } from './backend';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ---------------------------------------------------------------------------
// Gemini response schema – quantity is NO longer returned by the AI
// ---------------------------------------------------------------------------

const movieQueriesSchema = {
  type: Type.OBJECT,
  properties: {
    needsMovies: {
      type: Type.BOOLEAN,
      description:
        'True if the user is asking for movie recommendations, false otherwise',
    },
    response: {
      type: Type.STRING,
      description: 'A friendly response to the user in Portuguese',
    },
    queries: {
      type: Type.ARRAY,
      description:
        'Specific movie titles or very precise search terms (only if needsMovies is true)',
      items: { type: Type.STRING },
    },
    detectedGenre: {
      type: Type.STRING,
      description:
        'The main genre/category detected from the user request (e.g. "comédia", "terror", "ação")',
    },
    detectedAudience: {
      type: Type.STRING,
      description:
        'Target audience if mentioned (e.g. "família", "adulto", "infantil")',
    },
    detectedTone: {
      type: Type.STRING,
      description:
        'Tone/mood if mentioned (e.g. "leve", "sério", "tenso", "engraçado")',
    },
  },
  required: ['needsMovies', 'response'],
};

// ---------------------------------------------------------------------------
// Build the system prompt including structured context when available
// ---------------------------------------------------------------------------

function buildPrompt(
  userMessage: string,
  quantity: number,
  ctx?: RecommendationContext | null,
): string {
  const excludeSection =
    ctx && ctx.excludeTitles.length > 0
      ? `\n\nTÍTULOS JÁ RECOMENDADOS (NÃO repita nenhum destes):\n${ctx.excludeTitles.map((t) => `- ${t}`).join('\n')}`
      : '';

  const contextSection =
    ctx && (ctx.genre || ctx.audience || ctx.tone || ctx.theme)
      ? `\n\nCONTEXTO DA CONVERSA ATUAL (mantenha consistência):\n${ctx.genre ? `- Gênero principal: ${ctx.genre}` : ''}${ctx.audience ? `\n- Público-alvo: ${ctx.audience}` : ''}${ctx.tone ? `\n- Tom/mood: ${ctx.tone}` : ''}${ctx.theme ? `\n- Tema extra: ${ctx.theme}` : ''}`
      : '';

  const isRefinement = ctx?.lastIntentType === 'refine';
  const refinementInstruction = isRefinement
    ? `\n\nATENÇÃO: O usuário está REFINANDO a recomendação anterior. Mantenha o gênero principal (${ctx?.genre || 'o mesmo'}) e apenas ajuste o perfil conforme o pedido do usuário.`
    : '';

  return `Você é um especialista em cinema e TV que recomenda filmes E SÉRIES com ALTA PRECISÃO.

REGRAS IMPORTANTES:
1. Retorne EXATAMENTE ${quantity} títulos na array "queries"
2. Seja MUITO específico nos termos de busca - use títulos exatos conhecidos
3. Para séries, use títulos como "Breaking Bad", "Stranger Things", "The Office", etc.
4. Se for cumprimento/conversa casual, responda brevemente com needsMovies=false
5. NÃO responda sobre código, programação ou assuntos técnicos complexos
6. Sempre responda em português brasileiro
7. Misture filmes e séries nas recomendações para dar mais variedade
8. Preencha detectedGenre, detectedAudience e detectedTone com base no pedido do usuário${contextSection}${excludeSection}${refinementInstruction}

EXEMPLOS DE TEMAS:
- "filme de skate" → queries: ["Lords of Dogtown", "Skate Kitchen", "Mid90s"]
- "oi" → needsMovies: false, response: "Olá! Como posso ajudar com filmes e séries hoje?"
- "filme de terror" → queries: ["The Conjuring", "Hereditary", "Stranger Things"]
- "comédia" → queries: ["The Office", "Friends", "Superbad"]

Mensagem do usuário: "${userMessage}"

Retorne JSON com needsMovies, response, queries (se needsMovies=true), detectedGenre, detectedAudience e detectedTone.`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface GeminiRecommendationResult {
  text: string;
  movies: Movie[];
  detectedGenre?: string;
  detectedAudience?: string;
  detectedTone?: string;
}

export async function getMovieRecommendations(
  userMessage: string,
  quantity: number = 3,
  ctx?: RecommendationContext | null,
): Promise<GeminiRecommendationResult> {
  if (process.env.EXPO_PUBLIC_API_URL) {
    try {
      return await getBackendRecommendations(userMessage, quantity, ctx);
    } catch (error) {
      console.warn('Backend de recomendações indisponível; usando fallback local.', error);
    }
  }

  let retries = 3;
  const excludeTitles = new Set(
    (ctx?.excludeTitles ?? []).map((t) => t.toLowerCase()),
  );
  const excludeTmdbIds = new Set(ctx?.excludeTmdbIds ?? []);

  while (retries > 0) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: buildPrompt(userMessage, quantity, ctx),
        config: {
          responseMimeType: 'application/json',
          responseSchema: movieQueriesSchema,
        },
      });

      const jsonText = (response.text || '').trim();
      const parsed = JSON.parse(jsonText);

      if (
        parsed.needsMovies &&
        Array.isArray(parsed.queries) &&
        parsed.queries.length > 0
      ) {
        // Request more than needed so we can deduplicate
        const searchQueries = parsed.queries.slice(0, quantity * 2);
        const moviePromises = searchQueries.map((title: string) =>
          searchMovies(title),
        );
        const movieResults = await Promise.all(moviePromises);

        const movies = movieResults
          .flatMap((result) => result.slice(0, 1))
          .filter((m) => m && m.imageUrl)
          .filter((m) => {
            const isDuplTitle = excludeTitles.has(m.title.toLowerCase());
            const isDuplId =
              Boolean(m.tmdbId) && excludeTmdbIds.has(m.tmdbId);
            return !isDuplTitle && !isDuplId;
          });

        return {
          text: parsed.response || 'Aqui estão suas recomendações:',
          movies: movies.slice(0, quantity),
          detectedGenre: parsed.detectedGenre,
          detectedAudience: parsed.detectedAudience,
          detectedTone: parsed.detectedTone,
        };
      }

      return {
        text: parsed.response || 'Como posso ajudar você com filmes hoje?',
        movies: [],
        detectedGenre: parsed.detectedGenre,
        detectedAudience: parsed.detectedAudience,
        detectedTone: parsed.detectedTone,
      };
    } catch (error: any) {
      retries--;

      if (error?.message?.includes('overloaded') && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      console.error('Gemini error:', error);
      return {
        text: 'O servidor de IA está ocupado no momento. Tente novamente em alguns segundos! 😊',
        movies: [],
      };
    }
  }

  return {
    text: 'O servidor de IA está ocupado no momento. Tente novamente em alguns segundos! 😊',
    movies: [],
  };
}
