import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme/tokens';

export function Screen({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.column,
            { paddingHorizontal: width <= layout.narrowWidth ? spacing.lg : spacing.xl },
          ]}>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  scrollContent: { alignItems: 'center' },
  column: {
    width: '100%',
    maxWidth: layout.maxWidth,
    paddingTop: spacing.section,
    paddingBottom: spacing.large,
    gap: spacing.section,
  },
});
