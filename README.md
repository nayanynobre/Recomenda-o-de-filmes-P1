# ReelAI

Aplicativo móvel/web para descobrir filmes e séries com recomendações personalizadas por IA, catálogo do TMDB e disponibilidade de streaming. Esta versão está preparada para a **P1: hospedagem pública, API em Node/Express e persistência em MongoDB Atlas**.

## Arquitetura

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Aplicativo | Expo Router, React Native, Expo Web | Interface mobile e web publicada na Vercel |
| API | Node.js, Express | Recomendações, busca TMDB, health check e conversas |
| Banco | MongoDB Atlas via Mongoose | Persistência das conversas por usuário |
| Autenticação | Clerk | Login e identificação do usuário no app |
| Dados/IA | TMDB e Google Gemini | Catálogo e recomendações |

Quando `EXPO_PUBLIC_API_URL` é configurada, recomendações e histórico de conversa passam pela API hospedada. O armazenamento local continua como fallback para desenvolvimento offline.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run start:app
```

Para executar a API localmente em outro terminal, configure `MONGODB_URI`, `TMDB_BEARER_TOKEN` e `GEMINI_API_KEY` no `.env` e execute:

```bash
npm start
```

A API ficará disponível em `http://localhost:3000` e seu teste de saúde é:

```bash
curl http://localhost:3000/api/health
```

## Deploy do backend no Render

1. Faça push deste projeto para um repositório GitHub seu.
2. No Render, escolha **New > Web Service** e conecte o repositório.
3. Use `npm install` como Build Command e `npm start` como Start Command.
4. Adicione as variáveis `MONGODB_URI`, `TMDB_BEARER_TOKEN`, `GEMINI_API_KEY`, `CORS_ORIGIN` e `NODE_ENV=production`.
5. Após o deploy, confirme `https://SEU-SERVICO.onrender.com/api/health`.

O arquivo `render.yaml` já contém a configuração base. As chaves secretas devem ser preenchidas no painel do Render, nunca commitadas no Git.

## Banco no MongoDB Atlas

Crie um cluster gratuito, um usuário de banco e uma regra de rede para o serviço do Render. Copie a connection string para `MONGODB_URI`, substituindo usuário, senha e nome do banco. A API cria automaticamente a coleção `conversations` na primeira gravação.

## Deploy do frontend na Vercel

1. Importe o mesmo repositório na Vercel.
2. O `vercel.json` usa `npx expo export --platform web` e publica `dist`.
3. Configure `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` e `EXPO_PUBLIC_API_URL` com a URL pública do Render.
4. Publique e teste login, busca, recomendações e limpeza do histórico.

## Endpoints da API

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/api/health` | Verifica serviço e conexão com MongoDB |
| GET | `/api/movies/search?query=...` | Pesquisa filmes/séries no TMDB |
| POST | `/api/recommendations` | Gera recomendações com Gemini e enriquece com TMDB |
| GET | `/api/conversations/:userId` | Carrega histórico persistido |
| PUT | `/api/conversations/:userId` | Salva histórico persistido |
| DELETE | `/api/conversations/:userId` | Remove histórico persistido |

## Segurança e checklist P1

- `.env` e segredos estão no `.gitignore`.
- Chaves do TMDB e Gemini podem ficar apenas no backend Render.
- O frontend sincroniza conversas por `userId` do Clerk e mantém fallback local.
- A API tem tratamento de erros, validação básica de payload e endpoint de health check.
- O CORS pode ser restringido pela variável `CORS_ORIGIN`.
- Antes da entrega, valide as URLs públicas, o status `database: connected`, persistência após recarregar e layout mobile/web.
