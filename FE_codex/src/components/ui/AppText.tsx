import { Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type AppTextProps = TextProps & {
  variant?: keyof typeof typography;
  tone?: 'ink' | 'muted' | 'action' | 'surface' | 'disabledInk';
};

export function AppText({ variant = 'body', tone = 'ink', style, ...props }: AppTextProps) {
  return <Text {...props} style={[typography[variant], { color: colors[tone] }, style]} />;
}
