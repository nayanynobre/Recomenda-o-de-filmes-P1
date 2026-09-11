import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'ios_from_right',
                contentStyle: { backgroundColor: '#0A0A0A' },
            }}
        >
            <Stack.Screen name="sign-in" />
        </Stack>
    );
}
