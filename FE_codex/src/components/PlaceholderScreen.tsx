import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { spacing } from '@/theme/tokens';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <View style={styles.copy}>
        <AppText variant="screenTitle" accessibilityRole="header">{title}</AppText>
        <AppText tone="muted">Đang phát triển</AppText>
      </View>
      <Button
        variant="secondary"
        label="Quay lại"
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/');
          }
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { gap: spacing.sm },
});
