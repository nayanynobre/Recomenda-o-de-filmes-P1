import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { ArrowLeft, Send, Trash2 } from "lucide-react-native";
import {
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatMessage } from "@/components/ChatMessage";
import { MovieBottomSheet } from "@/components/MovieBottomSheet";
import { Text } from "@/components/ui/text";
import { View } from "@/components/ui/view";
import { useColor } from "@/hooks/useColor";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Movie } from "@/services/api";
import {
  getMovieRecommendations,
  GeminiRecommendationResult,
} from "@/services/gemini";
import {
  RecommendationContext,
  addExclusions,
  applyRefinement,
  buildNewContext,
  classifyIntent,
  clearContext,
  createEmptyContext,
  extractQuantity,
  loadContext,
  mergeContext,
  saveContext,
} from "@/services/chatContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  movies?: Movie[];
  userPrompt?: string;
  conversationContext?: string;
  isFollowUp?: boolean;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: "welcome",
  text: "Olá! Estou aqui para recomendar filmes. Me diga o que você gostaria de assistir!",
  isUser: false,
};

function getChatStorageKey(userId: string) {
  return `reelai:chat:${userId}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, isLoaded } = useAuth();

  const textColor = useColor("text");
  const mutedColor = useColor("textMuted");
  const borderColor = useColor("border");
  const blueColor = useColor("blue");
  const bgColor = useColor("background");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [hasHydratedCache, setHasHydratedCache] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const recCtxRef = useRef<RecommendationContext>(createEmptyContext());

  const storageKey = userId ? getChatStorageKey(userId) : null;
  const composerBottom =
    keyboardHeight > 0
      ? Math.max(
          8,
          keyboardHeight - (Platform.OS === "ios" ? insets.bottom : 0) + 8,
        )
      : Math.max(insets.bottom, 12);

  // ---- Keyboard listeners ----
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // ---- Scroll ----
  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // ---- Hydrate messages + context from cache ----
  useEffect(() => {
    let isMounted = true;

    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setInput("");
    setSelectedMovie(null);
    setLoading(false);
    setHasHydratedCache(false);
    recCtxRef.current = createEmptyContext();

    if (!isLoaded || !storageKey || !userId) return;

    const hydrate = async () => {
      try {
        const [cached, savedCtx] = await Promise.all([
          AsyncStorage.getItem(storageKey),
          loadContext(userId),
        ]);
        if (!isMounted) return;

        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }

        if (savedCtx) {
          recCtxRef.current = savedCtx;
        }
      } catch {
        if (!isMounted) return;
      } finally {
        if (isMounted) setHasHydratedCache(true);
      }
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, [isLoaded, storageKey, userId]);

  // ---- Persist messages ----
  useEffect(() => {
    if (!isLoaded || !storageKey || !hasHydratedCache) return;
    if (messages.length <= 1) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(messages)).catch(() => {});
  }, [isLoaded, storageKey, hasHydratedCache, messages]);

  // ---- Persist context helper ----
  const persistCtx = useCallback(
    (ctx: RecommendationContext) => {
      recCtxRef.current = ctx;
      if (userId) saveContext(userId, ctx);
    },
    [userId],
  );

  // ---- Clear conversation ----
  const handleClearConversation = useCallback(async () => {
    if (loading) return;

    if (storageKey) {
      await AsyncStorage.removeItem(storageKey).catch(() => {});
    }
    if (userId) {
      await clearContext(userId);
    }

    recCtxRef.current = createEmptyContext();
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    setInput("");
    setSelectedMovie(null);
  }, [storageKey, loading, userId]);

  // ---- Send message ----
  const handleSend = async () => {
    if (!input.trim() || loading || !userId) return;

    const currentInput = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInput,
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const intent = classifyIntent(currentInput);
      let ctx = recCtxRef.current;
      let quantity: number;
      let response: GeminiRecommendationResult;

      switch (intent) {
        // ---------------------------------------------------------------
        // FOLLOW-UP: keep everything, just fetch more of the same
        // ---------------------------------------------------------------
        case "follow_up": {
          quantity = extractQuantity(currentInput, ctx.quantity);
          ctx = { ...ctx, quantity, lastIntentType: "follow_up" };

          response = await getMovieRecommendations(currentInput, quantity, ctx);

          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.text,
            isUser: false,
            movies: response.movies,
            conversationContext: ctx.genre || "geral",
            isFollowUp: true,
          };
          setMessages((prev) => [...prev, aiMsg]);

          // Exclude newly recommended titles
          ctx = addExclusions(
            ctx,
            response.movies.map((m) => m.title),
            response.movies
              .map((m) => m.tmdbId)
              .filter((id): id is number => Boolean(id)),
          );
          persistCtx(ctx);
          break;
        }

        // ---------------------------------------------------------------
        // REFINE: preserve genre/audience/tone and tweak
        // ---------------------------------------------------------------
        case "refine": {
          ctx = applyRefinement(ctx, currentInput);
          quantity = ctx.quantity;

          response = await getMovieRecommendations(currentInput, quantity, ctx);

          // Enrich context with anything the AI detected
          if (response.detectedGenre && !ctx.genre) {
            ctx.genre = response.detectedGenre;
          }

          const refineMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.text,
            isUser: false,
            movies: response.movies,
            userPrompt: currentInput,
            conversationContext: ctx.genre || "geral",
          };
          setMessages((prev) => [...prev, refineMsg]);

          ctx = addExclusions(
            ctx,
            response.movies.map((m) => m.title),
            response.movies
              .map((m) => m.tmdbId)
              .filter((id): id is number => Boolean(id)),
          );
          persistCtx(ctx);
          break;
        }

        // ---------------------------------------------------------------
        // NEW: fresh recommendation request
        // ---------------------------------------------------------------
        default: {
          const partial = buildNewContext(currentInput);
          quantity = partial.quantity ?? 3;

          // Start a clean context
          ctx = mergeContext(createEmptyContext(), {
            ...partial,
            quantity,
            lastIntentType: "new",
          });

          response = await getMovieRecommendations(currentInput, quantity, ctx);

          // Enrich context from Gemini's detected metadata
          if (response.detectedGenre) ctx.genre = response.detectedGenre;
          if (response.detectedAudience) ctx.audience = response.detectedAudience;
          if (response.detectedTone) ctx.tone = response.detectedTone;

          const newMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.text,
            isUser: false,
            movies: response.movies,
            userPrompt: currentInput,
            conversationContext: ctx.genre || "geral",
          };
          setMessages((prev) => [...prev, newMsg]);

          ctx = addExclusions(
            ctx,
            response.movies.map((m) => m.title),
            response.movies
              .map((m) => m.tmdbId)
              .filter((id): id is number => Boolean(id)),
          );
          persistCtx(ctx);
          break;
        }
      }
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, ocorreu um erro. Tente novamente!",
        isUser: false,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ----
  const canSend = input.trim().length > 0 && !loading;

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <ChatMessage message={item} onMoviePress={setSelectedMovie} />
    ),
    [],
  );

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.navigate("/(tabs)")}
            style={[styles.iconButton, { borderColor }]}
            accessibilityRole="button"
            accessibilityLabel="Voltar para Home"
          >
            <ArrowLeft size={18} color={mutedColor} />
          </TouchableOpacity>
          <Text variant="title" style={styles.headerTitle}>
            Chat
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleClearConversation}
          style={[styles.iconButton, { borderColor }]}
          accessibilityRole="button"
          accessibilityLabel="Limpar conversa"
          disabled={!isLoaded || !userId || loading}
        >
          <Trash2 size={16} color={mutedColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: 102 + composerBottom },
        ]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <ChatMessage
              message={{
                id: "loading",
                text: "Pensando...",
                isUser: false,
                conversationContext: undefined,
              }}
            />
          ) : null
        }
      />

      <View
        style={[
          styles.composerWrapper,
          {
            bottom: composerBottom,
            borderColor,
            backgroundColor: isDark
              ? Platform.OS === 'ios' ? 'rgba(20,20,22,0.72)' : 'rgba(20,20,22,0.95)'
              : Platform.OS === 'ios' ? 'rgba(245,245,247,0.78)' : 'rgba(245,245,247,0.98)',
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            intensity={90}
            style={StyleSheet.absoluteFill}
          />
        ) : null}

        <View style={styles.composerInner}>
          <TextInput
            style={[styles.textInput, { color: textColor }]}
            placeholder="Digite sua mensagem..."
            placeholderTextColor={mutedColor}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: canSend ? blueColor : "rgba(120,120,128,0.3)",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensagem"
          >
            <Send size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <MovieBottomSheet
        movie={selectedMovie}
        isVisible={!!selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,120,128,0.14)",
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexGrow: 1,
  },
  composerWrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  composerInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
