import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntentType = 'new' | 'follow_up' | 'refine';

export interface RecommendationContext {
  genre?: string;
  audience?: string;
  tone?: string;
  quantity: number;
  theme?: string;
  excludeTitles: string[];
  excludeTmdbIds: number[];
  lastIntentType?: IntentType;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function contextStorageKey(userId: string) {
  return `reelai:chat_context:${userId}`;
}

export async function loadContext(
  userId: string,
): Promise<RecommendationContext | null> {
  try {
    const raw = await AsyncStorage.getItem(contextStorageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as RecommendationContext;
  } catch {
    return null;
  }
}

export async function saveContext(
  userId: string,
  ctx: RecommendationContext,
): Promise<void> {
  try {
    await AsyncStorage.setItem(contextStorageKey(userId), JSON.stringify(ctx));
  } catch {
    // silent
  }
}

export async function clearContext(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(contextStorageKey(userId));
  } catch {
    // silent
  }
}

// ---------------------------------------------------------------------------
// Create blank context
// ---------------------------------------------------------------------------

export function createEmptyContext(): RecommendationContext {
  return {
    quantity: 3,
    excludeTitles: [],
    excludeTmdbIds: [],
  };
}

// ---------------------------------------------------------------------------
// Intent classification
// ---------------------------------------------------------------------------

const FOLLOW_UP_PATTERNS = [
  /^mais\s*\d*$/i,
  /^mais\s+(op[cç][oõ]es|filmes|s[eé]ries|alguns|outros)/i,
  /^outros$/i,
  /^quero\s+mais$/i,
  /^me\s+d[aáê]\s+mais/i,
  /^continua/i,
];

const REFINE_PATTERNS = [
  /mais\s+(adulto|s[eé]rio|recente|antigo|leve|pesado|rom[aâ]ntico|engraçado|tenso|assustador|longo|curto)/i,
  /menos\s+(infantil|s[eé]rio|violento|rom[aâ]ntico|engraçado|pesado|leve|longo|curto)/i,
  /sem\s+(anima[cç][aã]o|terror|com[eé]dia|drama|romance|a[cç][aã]o)/i,
  /algo\s+mais/i,
  /quero\s+(algo|coisa)\s+mais/i,
  /pode\s+ser\s+mais/i,
  /prefiro\s+(algo\s+)?mais/i,
  /n[aã]o\s+t[aã]o\s+/i,
];

export function classifyIntent(input: string): IntentType {
  const trimmed = input.trim();

  for (const pattern of REFINE_PATTERNS) {
    if (pattern.test(trimmed)) return 'refine';
  }

  for (const pattern of FOLLOW_UP_PATTERNS) {
    if (pattern.test(trimmed)) return 'follow_up';
  }

  return 'new';
}

// ---------------------------------------------------------------------------
// Extract quantity from user message (never let the AI decide)
// ---------------------------------------------------------------------------

export function extractQuantity(input: string, fallback: number = 3): number {
  // "top 5", "5 filmes", "mais 3", "quero 10"
  const match = input.match(
    /(?:top\s*|mais\s*|quero\s*|me\s+d[aáê]\s+)?(\d{1,2})\s*(?:filmes?|s[eé]ries?|op[cç][oõ]es?)?/i,
  );
  if (match) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= 20) return n;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Apply refinement to existing context
// ---------------------------------------------------------------------------

export function applyRefinement(
  ctx: RecommendationContext,
  input: string,
): RecommendationContext {
  const lower = input.toLowerCase();
  const updated = { ...ctx, lastIntentType: 'refine' as IntentType };

  // Audience refinements
  if (/mais\s+adulto/i.test(lower) || /menos\s+infantil/i.test(lower)) {
    updated.audience = 'adulto';
  } else if (/mais\s+infantil/i.test(lower) || /para\s+crian[cç]as/i.test(lower)) {
    updated.audience = 'infantil';
  } else if (/em\s+fam[ií]lia/i.test(lower) || /para\s+fam[ií]lia/i.test(lower)) {
    updated.audience = 'família';
  }

  // Tone refinements
  if (/mais\s+s[eé]rio/i.test(lower) || /menos\s+engraçado/i.test(lower)) {
    updated.tone = 'sério';
  } else if (/mais\s+leve/i.test(lower) || /menos\s+pesado/i.test(lower)) {
    updated.tone = 'leve';
  } else if (/mais\s+engraçado/i.test(lower)) {
    updated.tone = 'engraçado';
  } else if (/mais\s+tenso/i.test(lower) || /mais\s+assustador/i.test(lower)) {
    updated.tone = 'tenso';
  } else if (/mais\s+rom[aâ]ntico/i.test(lower)) {
    updated.tone = 'romântico';
  }

  // Recency refinements
  if (/mais\s+recente/i.test(lower)) {
    updated.theme = (updated.theme ? updated.theme + ', ' : '') + 'recentes';
  } else if (/mais\s+antigo/i.test(lower) || /cl[aá]ssico/i.test(lower)) {
    updated.theme = (updated.theme ? updated.theme + ', ' : '') + 'clássicos';
  }

  // Genre exclusion → captured from "sem animação", "sem terror", etc.
  const excludeGenreMatch = lower.match(
    /sem\s+(anima[cç][aã]o|terror|com[eé]dia|drama|romance|a[cç][aã]o|thriller|fic[cç][aã]o)/i,
  );
  if (excludeGenreMatch) {
    const excluded = excludeGenreMatch[1]
      .replace(/[cç]/g, 'c')
      .replace(/[aã]/g, 'a');
    // If current genre matches what user wants to exclude, clear it
    if (updated.genre && updated.genre.toLowerCase().includes(excluded)) {
      updated.genre = undefined;
    }
    updated.theme = (updated.theme ? updated.theme + ', ' : '') + `sem ${excludeGenreMatch[1]}`;
  }

  // Update quantity if the user specifies one in a refinement
  const qty = extractQuantity(input, 0);
  if (qty > 0) {
    updated.quantity = qty;
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Build context from a brand-new message (let Gemini fill what it can)
// ---------------------------------------------------------------------------

export function buildNewContext(
  input: string,
): Partial<RecommendationContext> {
  const lower = input.toLowerCase();
  const partial: Partial<RecommendationContext> = {
    lastIntentType: 'new',
    quantity: extractQuantity(input),
    excludeTitles: [],
    excludeTmdbIds: [],
  };

  // Genre detection
  const genreMap: [RegExp, string][] = [
    [/terror|horror/i, 'terror'],
    [/com[eé]dia|comedy/i, 'comédia'],
    [/a[cç][aã]o|action/i, 'ação'],
    [/drama/i, 'drama'],
    [/fic[cç][aã]o\s*(cient[ií]fica)?|sci-?fi/i, 'ficção científica'],
    [/romance/i, 'romance'],
    [/anima[cç][aã]o|animation|animad/i, 'animação'],
    [/thriller|suspense/i, 'thriller'],
    [/document[aá]rio|documentary/i, 'documentário'],
    [/fantasia|fantasy/i, 'fantasia'],
    [/mist[eé]rio|mystery/i, 'mistério'],
    [/super[- ]?her[oó]i|marvel|avengers|batman|superman/i, 'super-heróis'],
    [/star\s*wars/i, 'ficção espacial'],
  ];

  for (const [pattern, genre] of genreMap) {
    if (pattern.test(lower)) {
      partial.genre = genre;
      break;
    }
  }

  // Audience detection
  if (/fam[ií]lia|familiar/i.test(lower)) {
    partial.audience = 'família';
  } else if (/adulto|maduro/i.test(lower)) {
    partial.audience = 'adulto';
  } else if (/infantil|crian[cç]a/i.test(lower)) {
    partial.audience = 'infantil';
  }

  // Tone detection
  if (/leve|descontra[ií]do/i.test(lower)) partial.tone = 'leve';
  if (/s[eé]rio|pesado|denso/i.test(lower)) partial.tone = 'sério';
  if (/engraçado|divertido/i.test(lower)) partial.tone = 'engraçado';

  return partial;
}

// ---------------------------------------------------------------------------
// Merge helper (for when we need to turn a partial into a full context)
// ---------------------------------------------------------------------------

export function mergeContext(
  base: RecommendationContext,
  partial: Partial<RecommendationContext>,
): RecommendationContext {
  return {
    genre: partial.genre ?? base.genre,
    audience: partial.audience ?? base.audience,
    tone: partial.tone ?? base.tone,
    quantity: partial.quantity ?? base.quantity,
    theme: partial.theme ?? base.theme,
    excludeTitles: [
      ...base.excludeTitles,
      ...(partial.excludeTitles ?? []),
    ],
    excludeTmdbIds: [
      ...base.excludeTmdbIds,
      ...(partial.excludeTmdbIds ?? []),
    ],
    lastIntentType: partial.lastIntentType ?? base.lastIntentType,
  };
}

// ---------------------------------------------------------------------------
// Add recommended titles to the exclusion list
// ---------------------------------------------------------------------------

export function addExclusions(
  ctx: RecommendationContext,
  titles: string[],
  tmdbIds: number[],
): RecommendationContext {
  return {
    ...ctx,
    excludeTitles: [
      ...new Set([...ctx.excludeTitles, ...titles.map((t) => t.toLowerCase())]),
    ],
    excludeTmdbIds: [
      ...new Set([...ctx.excludeTmdbIds, ...tmdbIds]),
    ],
  };
}
