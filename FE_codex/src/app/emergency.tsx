import { router, useLocalSearchParams } from 'expo-router';

import { useEmergencyCategory, useEmergencyCategoryHandoff } from '@/features/analysis/AnalysisResultSession';
import { EmergencySelectionScreen } from '@/features/guidance/EmergencySelectionScreen';

export default function EmergencyGuidanceRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string | string[] }>();
  const preview = __DEV__ && demo === '1';
  const category = useEmergencyCategory('selection');
  const handoff = useEmergencyCategoryHandoff();

  return (
    <EmergencySelectionScreen
      preview={preview}
      onBack={() => router.canGoBack() ? router.back() : router.replace('/')}
      onContinue={(scenario) => {
        if (!preview && category !== undefined) handoff.stage({ target: 'steps', category });
        router.navigate({
          pathname: '/emergency/steps',
          params: preview ? { scenario, demo: '1' } : { scenario },
        });
      }}
    />
  );
}
