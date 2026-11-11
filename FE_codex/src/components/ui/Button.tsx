import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme/tokens';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  icon?: IconName;
  disabled?: boolean;
  pending?: boolean;
};

export function Button({
  label, onPress, variant = 'primary', icon, disabled = false, pending = false,
}: ButtonProps) {
  const [focused, setFocused] = useState(false);
  const blocked = disabled || pending;
  const tone = blocked ? 'disabledInk' : variant === 'primary' ? 'surface' : 'action';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: pending }}
      disabled={blocked}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed),
        blocked && styles.disabled,
        focused && styles.focused,
      ]}>
      {pending && <ActivityIndicator color={colors[tone]} accessible={false} />}
      <AppText variant="control" tone={tone} style={styles.label}>{label}</AppText>
      {icon && !pending && <Icon name={icon} color={colors[tone]} size={20} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.buttonHeight,
    minWidth: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radii.control,
  },
  label: { flexShrink: 1, textAlign: 'center' },
  primary: { backgroundColor: colors.action },
  secondary: { backgroundColor: colors.surface, borderColor: colors.action },
  text: { backgroundColor: 'transparent' },
  primaryPressed: { backgroundColor: colors.actionPressed },
  pressed: { backgroundColor: colors.actionSurface },
  disabled: { backgroundColor: colors.disabledSurface, borderColor: 'transparent' },
  focused: { outlineColor: colors.focus, outlineOffset: 2, outlineWidth: 2, outlineStyle: 'solid' },
});
