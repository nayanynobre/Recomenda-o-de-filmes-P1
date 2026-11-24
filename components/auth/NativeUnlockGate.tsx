import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

export function NativeUnlockGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'ready' | 'locked' | 'unavailable'>('checking');

  const authenticate = useCallback(async () => {
    if (Platform.OS === 'web') {
      setState('unavailable');
      return;
    }
    try {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hardware && await LocalAuthentication.isEnrolledAsync();
      if (!hardware || !enrolled) {
        setState('unavailable');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o ReelAI',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      setState(result.success ? 'ready' : 'locked');
    } catch {
      setState('locked');
    }
  }, []);

  useEffect(() => { void authenticate(); }, [authenticate]);

  if (state === 'ready' || state === 'unavailable') return <>{children}</>;
  if (state === 'checking') return <View style={styles.container}><Text>Verificando segurança do dispositivo…</Text></View>;
  return (
    <View style={styles.container}>
      <Fingerprint size={48} color="#E50914" />
      <Text style={styles.title}>Desbloqueio necessário</Text>
      <Text style={styles.message}>Confirme sua identidade para acessar suas recomendações. O servidor continua sendo responsável pela autorização.</Text>
      <TouchableOpacity style={styles.button} onPress={() => void authenticate()} accessibilityRole="button" accessibilityLabel="Tentar desbloqueio novamente">
        <Text style={styles.buttonText}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 15, lineHeight: 22, textAlign: 'center', color: '#71717A' },
  button: { marginTop: 10, paddingHorizontal: 22, paddingVertical: 13, borderRadius: 12, backgroundColor: '#E50914' },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
