require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();

const port = Number(process.env.PORT || 3000);

const mongoUri = process.env.MONGODB_URI;

const tmdbToken =
  process.env.TMDB_BEARER_TOKEN ||
  process.env.EXPO_PUBLIC_TMDB_BEARER_TOKEN;

const geminiKey =
  process.env.GEMINI_API_KEY ||
  process.env.EXPO_PUBLIC_GEMINI_API_KEY;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : '*',
  })
);

app.use(express.json({ limit: '1mb' }));

// ============================================================
// MONGOOSE - MODELOS
// ============================================================

const messageSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },

    text: {
      type: String,
      required: true,
    },

    isUser: {
      type: Boolean,
      required: true,
    },

    movies: {
      type: mongoose.Schema.Types.Mixed,
    },

    userPrompt: String,

    conversationContext: String,

    isFollowUp: Boolean,
  },
  {
    _id: false,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    messages: {
      type: [messageSchema],
      default: [],
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Conversation =
  mongoose.models.Conversation ||
  mongoose.model('Conversation', conversationSchema);

// ============================================================
// CONEXÃO COM MONGODB
// ============================================================

let mongoConnectionPromise = null;

async function connectMongo() {
  if (!mongoUri) {
    console.warn(
      'MONGODB_URI não configurada: API iniciará sem persistência.'
    );

    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => {
        console.log('MongoDB conectado.');
        return mongoose.connection;
      })
      .catch((error) => {
        mongoConnectionPromise = null;
        console.error('Erro ao conectar ao MongoDB:', error);
        throw error;
      });
  }

  return mongoConnectionPromise;
}

// ============================================================
// MIDDLEWARE
// ============================================================

async function databaseMiddleware(req, res, next) {
  try {
    if (mongoUri) {
      await connectMongo();
    }

    next();
  } catch (error) {
    next(error);
  }
}

app.use('/api', databaseMiddleware);

function requireUserId(req, res, next) {
  const userId = req.header('x-user-id') || req.params.userId;

  if (!userId || userId.length > 160) {
    return res.status(400).json({
      error: 'userId é obrigatório.',
    });
  }

  req.userId = userId;

  next();
}

// ============================================================
// TMDB
// ============================================================

async function tmdb(path, params = {}) {
  if (!tmdbToken) {
    throw new Error('TMDB_BEARER_TOKEN não configurado.');
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);

  Object.entries({
    language: 'pt-BR',
    region: 'BR',
    ...params,
  }).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${tmdbToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB respondeu ${response.status}.`);
  }

  return response.json();
}

function image(path, size = 'w500') {
  return path
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : '';
}

function movie(item) {
  const year =
    Number.parseInt(
      (item.release_date || '').slice(0, 4),
      10
    ) || 0;

  return {
    id: String(item.id || ''),
    tmdbId: Number(item.id || 0),
    title: item.title || item.name || '',
    year,
    releaseYear: year,
    imageUrl:
      image(item.poster_path) ||
      image(item.backdrop_path),
    overview: item.overview || '',
    genres: [],
    rating: Number(item.vote_average || 0),
    runtime: Number(item.runtime || 0),
    director: '',
    actors: '',
    awards: '',
    streamingOptions: [],
  };
}

async function searchMovies(query) {
  const data = await tmdb('/search/multi', {
    query,
    page: 1,
    include_adult: false,
  });

  return (data.results || [])
    .filter(
      (item) =>
        item.media_type === 'movie' ||
        item.media_type === 'tv'
    )
    .slice(0, 3)
    .map(movie);
}

// ============================================================
// GEMINI
// ============================================================

const schema = {
  type: Type.OBJECT,

  properties: {
    needsMovies: {
      type: Type.BOOLEAN,
    },

    response: {
      type: Type.STRING,
    },

    queries: {
      type: Type.ARRAY,

      items: {
        type: Type.STRING,
      },
    },

    detectedGenre: {
      type: Type.STRING,
    },

    detectedAudience: {
      type: Type.STRING,
    },

    detectedTone: {
      type: Type.STRING,
    },
  },

  required: ['needsMovies', 'response'],
};

// ============================================================
// ROTAS
// ============================================================

// Teste da API
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'reelai-api',

    database:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  });
});

// ============================================================
// CONVERSAS
// ============================================================

app.get(
  '/api/conversations/:userId',
  requireUserId,
  async (req, res, next) => {
    try {
      const conversation = await Conversation.findOne({
        userId: req.userId,
      }).lean();

      res.json({
        messages: conversation?.messages || [],
      });
    } catch (error) {
      next(error);
    }
  }
);

app.put(
  '/api/conversations/:userId',
  requireUserId,
  async (req, res, next) => {
    try {
      if (
        !Array.isArray(req.body.messages) ||
        req.body.messages.length > 200
      ) {
        return res.status(422).json({
          error:
            'messages deve ser uma lista de até 200 itens.',
        });
      }

      const conversation =
        await Conversation.findOneAndUpdate(
          {
            userId: req.userId,
          },

          {
            userId: req.userId,
            messages: req.body.messages,
            updatedAt: new Date(),
          },

          {
            upsert: true,
            new: true,
            runValidators: true,
          }
        ).lean();

      res.json({
        saved: true,
        updatedAt: conversation.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  '/api/conversations/:userId',
  requireUserId,
  async (req, res, next) => {
    try {
      await Conversation.deleteOne({
        userId: req.userId,
      });

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// BUSCA DE FILMES
// ============================================================

app.get(
  '/api/movies/search',
  async (req, res, next) => {
    try {
      const query = String(
        req.query.query || ''
      ).trim();

      if (!query) {
        return res.json({
          movies: [],
        });
      }

      res.json({
        movies: await searchMovies(query),
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// RECOMENDAÇÕES
// ============================================================

app.post(
  '/api/recommendations',
  async (req, res, next) => {
    try {
      const {
        userMessage,
        quantity = 3,
        context = null,
      } = req.body || {};

      if (
        !userMessage ||
        typeof userMessage !== 'string'
      ) {
        return res.status(422).json({
          error: 'userMessage é obrigatório.',
        });
      }

      if (!geminiKey) {
        return res.status(503).json({
          error:
            'GEMINI_API_KEY não configurada.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
      });

      const requestedQuantity = Math.min(
        Math.max(Number(quantity) || 3, 1),
        20
      );

      const prompt = `
Você é um especialista em cinema e TV.

Responda em português brasileiro.

Retorne exatamente até ${requestedQuantity} títulos conhecidos em queries quando houver pedido de recomendação.

Não repita títulos já excluídos.

Contexto:
${JSON.stringify(context || {})}

Mensagem:
${userMessage}
`;

      const response =
        await ai.models.generateContent({
          model: 'gemini-2.5-flash',

          contents: prompt,

          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });

      const parsed = JSON.parse(
        (response.text || '{}').trim()
      );

      const results =
        parsed.needsMovies &&
        Array.isArray(parsed.queries)
          ? await Promise.all(
              parsed.queries
                .slice(0, 20)
                .map(searchMovies)
            )
          : [];

      const movies = results
        .flatMap((items) => items.slice(0, 1))
        .filter(
          (item, index, all) =>
            item.imageUrl &&
            all.findIndex(
              (other) =>
                other.tmdbId === item.tmdbId
            ) === index
        )
        .slice(0, requestedQuantity);

      res.json({
        text:
          parsed.response ||
          'Como posso ajudar você com filmes hoje?',

        movies,

        detectedGenre:
          parsed.detectedGenre,

        detectedAudience:
          parsed.detectedAudience,

        detectedTone:
          parsed.detectedTone,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================
// TRATAMENTO DE ERROS
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(error);

    res.status(500).json({
      error: 'Erro interno do servidor.',

      detail:
        process.env.NODE_ENV === 'production'
          ? undefined
          : error.message,
    });
  }
);

// ============================================================
// EXECUÇÃO LOCAL
// ============================================================

// Quando executado localmente:
// npm start
//
// No Vercel, o app é exportado pelo module.exports
// e não deve executar app.listen().

if (require.main === module) {
  connectMongo()
    .then(() => {
      app.listen(
        port,
        '0.0.0.0',
        () =>
          console.log(
            `ReelAI API listening on port ${port}`
          )
      );
    })
    .catch((error) => {
      console.error(
        'Falha ao iniciar API:',
        error
      );

      process.exit(1);
    });
}

module.exports = app;