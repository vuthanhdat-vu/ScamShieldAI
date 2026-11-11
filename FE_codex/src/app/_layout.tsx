import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AnalysisResultSession } from '@/features/analysis/AnalysisResultSession';
import { colors } from '@/theme/tokens';

export const unstable_settings = { anchor: 'index' };

export default function RootLayout() {
  return (
    <AnalysisResultSession>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </AnalysisResultSession>
  );
}
