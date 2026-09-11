import * as React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SignInWithOAuth } from '@/components/auth/SignInWithOAuth';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { useColorScheme } from '@/hooks/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Film } from 'lucide-react-native';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';

export default function SignInScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { isLoaded, isSignedIn } = useAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (isLoaded && isSignedIn) {
            router.replace('/onboarding');
        }
    }, [isLoaded, isSignedIn, router]);

    if (!isLoaded || isSignedIn) {
        return null;
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isDark ? ['#0A0A0A', '#1F1F1F'] : ['#FFFFFF', '#F4F4F5']}
                style={styles.gradient}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Film size={48} color="#E50914" strokeWidth={2} />
                        </View>
                        <Text style={styles.title}>Welcome to ReelAI</Text>
                        <Text style={styles.subtitle}>
                            Your AI-powered movie recommendation companion
                        </Text>
                    </View>

                    <View style={styles.authSection}>
                        <SignInWithOAuth mode="sign-in" />
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: 'rgba(229, 9, 20, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 24,
    },
    authSection: {
        gap: 24,
    },
});
