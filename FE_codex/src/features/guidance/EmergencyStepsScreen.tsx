import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import type { ApiError } from '@/lib/api/apiError';
import { colors, spacing } from '@/theme/tokens';

import {
  readGuidance, scenarioLabels, urgencyLabels, type EmergencyScenario, type EmergencyUrgency,
} from './emergencyGuidance';

type Props = {
  scenario: EmergencyScenario | undefined;
  response?: unknown;
  pending?: boolean;
  error?: ApiError;
  onRetry?: () => void;
  preview: boolean;
  onBack: () => void;
};

const unavailableCopy = {
  noScenario: 'Quay lại và chọn một tình huống để tiếp tục.',
  missing: 'Chưa có hướng dẫn cho tình huống này.',
  invalid: 'Không thể hiển thị hướng dẫn cho tình huống này.',
  empty: 'Chưa có bước xử lý để hiển thị cho tình huống này.',
};

const urgencyInk: Record<EmergencyUrgency, string> = {
  LOW: colors.muted,
  MEDIUM: colors.ink,
  HIGH: colors.errorInk,
};

export function EmergencyStepsScreen({ scenario, response, pending, error, onRetry, preview, onBack }: Props) {
  const result = readGuidance(scenario, response);
  const guidance = result.status === 'ready' ? result.guidance : undefined;
  const high = guidance?.urgency === 'HIGH';

  return (
    <Screen>
      <View style={styles.back}>
        <Button label="Quay lại chọn tình huống" icon="arrow-left" variant="text" onPress={onBack} />
      </View>
      <View style={styles.group}>
        <AppText variant="screenTitle" accessibilityRole="header">Các bước cần làm</AppText>
        {scenario && <AppText tone="muted">{scenarioLabels[scenario]}</AppText>}
      </View>

      {preview && (
        <Card>
          <AppText variant="control" tone="action">Dữ liệu mẫu · Chỉ dành cho phát triển</AppText>
        </Card>
      )}

      {pending ? (
        <Card style={styles.row} accessibilityState={{ busy: true }}>
          <ActivityIndicator color={colors.action} accessible={false} />
          <AppText tone="muted" style={styles.label} accessibilityLiveRegion="polite">
            Đang tải hướng dẫn…
          </AppText>
        </Card>
      ) : result.status === 'ready' ? (
        <>
          <Card style={[styles.group, high && styles.priority]}>
            <View style={styles.row}>
              <Icon name={high ? 'alert-circle-outline' : 'information-outline'}
                color={urgencyInk[result.guidance.urgency]} size={20} />
              <AppText variant="control" style={[styles.label, { color: urgencyInk[result.guidance.urgency] }]}>
                {urgencyLabels[result.guidance.urgency]}
              </AppText>
            </View>
            <AppText variant="sectionTitle" accessibilityRole="header">{result.guidance.title}</AppText>
          </Card>
          {result.guidance.steps.map((step, index) => {
            const firstPriority = high && index === 0;
            return (
              <Card key={index} style={[styles.row, firstPriority && styles.priority]}>
                <AppText variant="control" importantForAccessibility="no">{index + 1}.</AppText>
                <AppText
                  accessibilityLabel={`Bước ${index + 1}. ${step}`}
                  variant={firstPriority ? 'control' : 'body'}
                  style={styles.label}>
                  {step}
                </AppText>
              </Card>
            );
          })}
        </>
      ) : (
        <Card style={styles.group}>
          <AppText tone="muted" accessibilityLiveRegion="polite">
            {error?.message ?? unavailableCopy[result.status]}
          </AppText>
          {error?.requestId && (
            <AppText variant="secondary" tone="muted">Mã yêu cầu {error.requestId}</AppText>
          )}
          {scenario && (
            <AppText>
              Tạm dừng trao đổi. Nếu tài khoản có thể bị ảnh hưởng, hãy liên hệ ngân hàng hoặc dịch vụ qua kênh chính thức.
            </AppText>
          )}
          {error && onRetry && <Button label="Thử lại" variant="secondary" onPress={onRetry} />}
        </Card>
      )}

      <Button label="Chọn tình huống khác" variant="secondary" onPress={onBack} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', maxWidth: '100%' },
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  label: { flex: 1 },
  priority: { backgroundColor: colors.errorSurface },
});
