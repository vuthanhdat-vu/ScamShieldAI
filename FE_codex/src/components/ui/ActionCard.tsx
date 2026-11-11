import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { cardStyles } from './Card';
import { Icon, type IconName } from './Icon';

type ActionCardProps = {
  title: string;
  description: string;
  icon: IconName;
  onPress: () => void;
};

export function ActionCard({ title, description, icon, onPress }: ActionCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        cardStyles.surface,
        cardStyles.raised,
        styles.row,
        pressed && styles.pressed,
        focused && styles.focused,
      ]}>
      <View style={styles.icon}>
        <Icon name={icon} color={colors.action} />
      </View>
      <View style={styles.copy}>
        <AppText variant="sectionTitle">{title}</AppText>
        <AppText variant="secondary" tone="muted">{description}</AppText>
      </View>
      <Icon name="chevron-right" color={colors.action} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    backgroundColor: colors.actionSurface,
  },
  copy: { flex: 1, gap: spacing.xs },
  pressed: { backgroundColor: colors.actionSurface },
  focused: { outlineColor: colors.focus, outlineOffset: 2, outlineWidth: 2, outlineStyle: 'solid' },
});
