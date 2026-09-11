import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-expo';

export function useAuth() {
    const { user, isLoaded: userLoaded } = useUser();
    const { isSignedIn, isLoaded: authLoaded, signOut } = useClerkAuth();

    return {
        user,
        isLoaded: userLoaded && authLoaded,
        isSignedIn,
        signOut,
    };
}
