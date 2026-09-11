import * as React from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useColorScheme } from '@/hooks/useColorScheme';


WebBrowser.maybeCompleteAuthSession();

interface SignInWithOAuthProps {
  mode?: 'sign-in' | 'sign-up';
}

function isAlreadySignedInError(err: any) {
  const message = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  const clerkCode = String(err?.errors?.[0]?.code || '').toLowerCase();

  return (
    message.includes('already signed in') ||
    message.includes('already logged in') ||
    code === 'session_exists' ||
    clerkCode === 'session_exists'
  );
}

export function SignInWithOAuth({ mode = 'sign-in' }: SignInWithOAuthProps) {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [isLoading, setIsLoading] = React.useState(false);

  const onPress = React.useCallback(async () => {
    setIsLoading(true);

    try {
      // Mantém callback explícito para dev builds/expo com esquema customizado
      const redirectUrl = Linking.createURL('/sso-callback', { scheme: 'reelai' });

      console.log('🔵 [OAuth] Iniciando fluxo de autenticação...');
      console.log('🔵 [OAuth] Redirect URL gerada:', redirectUrl);

      const result = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      console.log('🔵 [OAuth] Resultado do fluxo:', {
        createdSessionId: result.createdSessionId,
        signIn: !!result.signIn,
        signUp: !!result.signUp,
        setActive: !!result.setActive
      });

      if (result.createdSessionId && result.setActive) {
        console.log('🟢 [OAuth] Sessão criada! ID:', result.createdSessionId);
        console.log('🔵 [OAuth] Ativando sessão...');
        await result.setActive({ session: result.createdSessionId });
        console.log('🟢 [OAuth] Sessão ativada com sucesso!');
        router.replace('/onboarding');
        return;
      } else {
        console.warn('⚠️ [OAuth] Nenhuma sessão criada. Resultado:', result);
        if (result.authSessionResult?.type === 'dismiss' || result.authSessionResult?.type === 'cancel') {
          alert('Se você estava confirmando a verificação de 2 etapas do Google, por favor clique em "Continue with Google" novamente para finalizar.\n\n(O sistema fechou o navegador para exibir a verificação).');
          return;
        }
        
        // Log extra de signIn e signUp
        let details = 'Desconhecido';
        if (result.signIn) {
          details = `SignIn Status: ${result.signIn.status}`;
        } else if (result.signUp) {
          details = `SignUp Status: ${result.signUp.status}`;
        }
        
        alert(`O login OAuth falhou em criar a sessão. Detalhes: ${details}`);
      }
    } catch (err: any) {
      if (isAlreadySignedInError(err)) {
        console.warn('⚠️ [OAuth] Sessão já ativa, redirecionando para tabs.');
        router.replace('/(tabs)');
        return;
      }

      console.error('🔴 [OAuth] Erro:', err);
      console.error('🔴 [OAuth] Erro detalhado:', {
        message: err?.message,
        code: err?.code,
        stack: err?.stack,
        errors: err?.errors
      });
      alert(`Erro ao fazer login: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      console.log('🔵 [OAuth] Finalizando (setIsLoading = false)');
      setIsLoading(false);
    }
  }, [startSSOFlow, router]);

  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDark ? '#FFFFFF' : '#FFFFFF',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.buttonContent}>
        {isLoading ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <GoogleIcon />
            <Text style={styles.buttonText}>
              {mode === 'sign-in' ? 'Continue with Google' : 'Sign up with Google'}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.googleIcon}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F1F1F',
  },
});
