import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Image, Animated, Easing } from "react-native";
import { Onboarding, OnboardingStep } from "@/components/ui/onboarding";
import { Film, MessageCircle, Sparkles } from "lucide-react-native";

const { width, height } = Dimensions.get("window");

// Imagens de cinema relacionadas (URLs de banco de imagens confiáveis / TMDB placeholders)
const movieImages = [
  "https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg", // Barbie
  "https://image.tmdb.org/t/p/w500/nb3xI8XI3w4pMVZ38SscBcvs3lb.jpg", // Oppenheimer
  "https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclRVc.jpg", // Interstellar
  "https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg", // Spider-Man: Across the Spider-Verse
  "https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg", // The Super Mario Bros. Movie
  "https://image.tmdb.org/t/p/w500/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg", // Avengers
  "https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg", // LOTR Return of the King
  "https://image.tmdb.org/t/p/w500/xBHvZcjRiWyobQ9wAwMD0qW4D0.jpg", // Dune
  "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg", // Deadpool
  "https://image.tmdb.org/t/p/w500/t6HIqrHeCPbzHPeQbs3gE5Qv3fB.jpg", // Guardians of the Galaxy Vol. 3
  "https://image.tmdb.org/t/p/w500/1E5baAaEse26fej7uHcjOgEE2t2.jpg", // Fast X
  "https://image.tmdb.org/t/p/w500/gPbM0MK8CP8A174rmUwGsADNYKD.jpg", // Transformers: Rise of the Beasts
  "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // The Dark Knight
];

function CinematicCarousel() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const POSTER_WIDTH = 140;
  const POSTER_GAP = 16;
  const POSTER_FULL_WIDTH = POSTER_WIDTH + POSTER_GAP;
  const ROW_WIDTH = POSTER_FULL_WIDTH * movieImages.length;

  useEffect(() => {
    let active = true;
    const startAnimation = () => {
      scrollX.setValue(0);
      Animated.timing(scrollX, {
        toValue: -ROW_WIDTH,
        duration: movieImages.length * 4000, 
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && active) {
          startAnimation();
        }
      });
    };

    startAnimation();
    
    return () => {
      active = false;
      scrollX.stopAnimation();
    };
  }, [scrollX, ROW_WIDTH]);

  // Duplicamos as imagens para loop infinito contínuo
  const infiniteImages = [...movieImages, ...movieImages];

  return (
    <View style={styles.carouselContainer}>
      <Animated.View
        style={[
          styles.animatedRow,
          {
            transform: [{ translateX: scrollX }],
          },
        ]}
      >
        {infiniteImages.map((uri, index) => (
          <View key={index} style={styles.carouselPosterWrapper}>
            <Image source={{ uri }} style={styles.posterImage} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function IconWithGradient({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "chat" | "magic";
}) {
  return (
    <View style={styles.iconContainer}>
      <View style={styles.iconWrapper}>{children}</View>
    </View>
  );
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const steps: OnboardingStep[] = [
    {
      id: "1",
      title: "Descubra Filmes Incríveis",
      description:
        "Explore milhares de filmes e séries com informações detalhadas e onde assistir",
      icon: <CinematicCarousel />,
    },
    {
      id: "2",
      title: "Chat com IA Inteligente",
      description:
        "Converse com nossa IA e receba recomendações personalizadas baseadas no seu gosto",
      icon: (
        <IconWithGradient variant="chat">
          <MessageCircle size={80} color="#007AFF" />
        </IconWithGradient>
      ),
    },
    {
      id: "3",
      title: "Experiência Mágica",
      description:
        "Transforme a forma como você descobre entretenimento. Sua jornada cinematográfica começa aqui!",
      icon: (
        <IconWithGradient variant="magic">
          <Sparkles size={80} color="#007AFF" />
        </IconWithGradient>
      ),
    },
  ];

  const handleComplete = async () => {
    onComplete();
  };

  const handleSkip = async () => {
    onComplete();
  };

  return (
    <View style={styles.container}>
      <Onboarding
        steps={steps}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  carouselContainer: {
    width: width,
    height: 260,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  animatedRow: {
    flexDirection: "row",
    alignItems: "center",
    width: 2000,
  },
  carouselPosterWrapper: {
    width: 140,
    height: 210,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#222",
    marginRight: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
  },
  posterImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  iconContainer: {
    width: 220,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconWrapper: {
    zIndex: 10,
  },
});
