import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ActionCard } from '@/components/ui/ActionCard';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { colors, layout, radii, spacing } from '@/theme/tokens';

export function HomeScreen() {
  return (
    <Screen>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Icon name="shield-outline" color={colors.surface} size={28} />
        </View>
        <View style={styles.brandCopy}>
          <AppText variant="sectionTitle">ScamShield AI</AppText>
          <AppText variant="secondary" tone="muted">Nhận diện dấu hiệu lừa đảo</AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <AppText variant="homeTitle" accessibilityRole="header" style={styles.heading}>
          Bạn muốn kiểm tra gì?
        </AppText>
        <ActionCard
          title="Kiểm tra tin nhắn"
          description="Phân tích nội dung tin nhắn hoặc đoạn hội thoại đáng ngờ."
          icon="message-text-outline"
          onPress={() => router.navigate('/analysis/text')}
        />
        <ActionCard
          title="Kiểm tra ảnh chụp màn hình"
          description="Chọn ảnh cuộc trò chuyện để kiểm tra các dấu hiệu lừa đảo."
          icon="image-multiple-outline"
          onPress={() => router.navigate('/analysis/images')}
        />
      </View>

      <Card style={styles.support}>
        <View style={styles.supportHeading}>
          <Icon name="lifebuoy" color={colors.ink} />
          <AppText variant="sectionTitle" accessibilityRole="header" style={styles.supportTitle}>
            Cần hỗ trợ ngay?
          </AppText>
        </View>
        <AppText tone="muted">
          Nếu bạn đã bấm vào liên kết, cung cấp thông tin hoặc chuyển tiền, hãy xem các bước xử lý.
        </AppText>
        <Button
          label="Xem hướng dẫn khẩn cấp"
          icon="arrow-right"
          onPress={() => router.navigate('/emergency')}
        />
      </Card>

      <View style={styles.trust}>
        <Icon name="information-outline" color={colors.muted} size={20} />
        <AppText variant="secondary" tone="muted" style={styles.trustCopy}>
          Kết quả AI chỉ để tham khảo. Kết quả ít rủi ro không bảo đảm an toàn. Hãy xác minh qua kênh chính thức
          trước khi làm theo yêu cầu.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  brandMark: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
  },
  brandCopy: { flex: 1 },
  actions: { gap: spacing.md },
  heading: { marginBottom: spacing.xs },
  support: {
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.supportSurface,
    borderColor: colors.supportBorder,
  },
  supportHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  supportTitle: { flexShrink: 1 },
  trust: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    borderTopColor: colors.divider,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  trustCopy: { flex: 1 },
});
