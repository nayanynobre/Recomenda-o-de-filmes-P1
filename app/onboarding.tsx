import { OnboardingScreen } from '@/components/OnboardingScreen';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function OnboardingRoute() {
  const router = useRouter();

  const handleComplete = () => {
    router.replace('/(tabs)');
  };

  return (
    <>
      <OnboardingScreen onComplete={handleComplete} />
      <StatusBar style='light' />
    </>
  );
}
