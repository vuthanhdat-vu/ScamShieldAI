import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

export const cardStyles = StyleSheet.create({
  surface: {
    backgroundColor: colors.surface,
    borderColor: colors.divider,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  raised: Platform.select({
    android: { elevation: 2 },
    ios: {
      shadowColor: colors.ink,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
    },
    default: {},
  }),
});

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[cardStyles.surface, style]} />;
}
