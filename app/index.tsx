import { useEffect } from 'react';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { isSignedIn, isLoaded } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn) {
                router.replace('/(tabs)');
            } else {
                router.replace('/(auth)/sign-in');
            }
        }
    }, [isLoaded, isSignedIn]);

    // Show loading while checking auth state
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}
