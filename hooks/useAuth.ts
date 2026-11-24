import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-expo';

export function useAuth() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isSignedIn, isLoaded: authLoaded, signOut, getToken } = useClerkAuth();

  return {
    user,
    userId: user?.id ?? null,
    isLoaded: userLoaded && authLoaded,
    isSignedIn,
    signOut,
    getToken,
  };
}
