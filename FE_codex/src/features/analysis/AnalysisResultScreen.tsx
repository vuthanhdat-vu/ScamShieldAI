import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { colors, riskColors, spacing } from '@/theme/tokens';

import { evidenceSourceLabel, isAnalysisResponse } from './analysisResult';
import { categoryLabels, riskCopy, signalLabels, urlSignalLabels } from './resultCopy';

type Props = {
  response?: unknown;
  preview?: ReactNode;
  onHome: () => void;
  onEmergency: () => void;
};

function ResultSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <Card style={styles.group}>
      <AppText variant="sectionTitle" accessibilityRole="header">{title}</AppText>
      {children}
    </Card>
  );
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });

export function AnalysisResultScreen({ response, preview, onHome, onEmergency }: Props) {
  if (!isAnalysisResponse(response)) {
    return (
      <Screen>
        <AppText variant="screenTitle" accessibilityRole="header">Kết quả kiểm tra</AppText>
        <Card>
          <AppText tone="muted">
            {response === undefined
              ? 'Không có kết quả để hiển thị.'
              : 'Dữ liệu kết quả không hợp lệ. Hãy quay về trang chủ để thử lại.'}
          </AppText>
        </Card>
        <Button label="Về trang chủ" onPress={onHome} />
      </Screen>
    );
  }

  const risk = riskCopy[response.risk_level];
  const palette = riskColors[response.risk_level];
  const score = response.risk_score;

  return (
    <Screen>
      <View style={styles.compactGroup}>
        <AppText variant="screenTitle" accessibilityRole="header">Kết quả kiểm tra</AppText>
        <AppText variant="secondary" tone="muted">
          {response.input_type === 'TEXT' ? 'Tin nhắn' : 'Ảnh chụp màn hình'}
          {' · '}{dateFormat.format(new Date(response.analyzed_at))}
        </AppText>
      </View>
      {preview}

      <Card style={[styles.group, { backgroundColor: palette.surface }]}>
        <View style={styles.status}>
          <Icon name={risk.icon} color={palette.ink} />
          <AppText variant="sectionTitle" accessibilityRole="header"
            style={[styles.grow, { color: palette.ink }]}>
            {risk.title}
          </AppText>
        </View>
        <AppText variant="control">
          {score === null ? 'Điểm rủi ro chưa xác định' : `Điểm rủi ro ${score}/100`}
        </AppText>
        <AppText variant="secondary" tone="muted">
          Điểm rủi ro được ước tính từ các dấu hiệu tìm thấy, không phải xác suất bị lừa đảo.
        </AppText>
        <View style={styles.divided}>
          <AppText variant="secondary" tone="muted">Hình thức lừa đảo</AppText>
          <AppText variant="control">{categoryLabels[response.scam_category]}</AppText>
        </View>
        <AppText>{response.summary}</AppText>
        {response.risk_level === 'SAFE' && (
          <AppText variant="secondary" tone="muted">
            Kết quả này không bảo đảm an toàn. Hãy xác minh qua kênh chính thức.
          </AppText>
        )}
        {score === null && (
          <AppText variant="secondary" tone="muted">
            Chưa đủ thông tin để đánh giá. Hãy kiểm tra qua kênh chính thức trước khi cung cấp thông tin hoặc chuyển tiền.
          </AppText>
        )}
      </Card>

      <Button label="Xem hướng dẫn khẩn cấp" icon="arrow-right" onPress={onEmergency} />

      <ResultSection title="Việc bạn nên làm">
        {response.recommended_actions.length === 0 ? (
          <AppText tone="muted">Xác minh qua kênh chính thức trước khi làm theo yêu cầu.</AppText>
        ) : response.recommended_actions.map((action, index) => (
          <View style={styles.action} key={index}>
            <AppText variant="control" tone="action">{index + 1}.</AppText>
            <AppText style={styles.grow}>{action}</AppText>
          </View>
        ))}
      </ResultSection>

      {response.evidence.length > 0 && (
        <ResultSection title="Dấu hiệu tìm thấy">
          {response.evidence.map((item, index) => (
            <View key={index} style={styles.divided}>
              <AppText variant="secondary" tone="action">
                {evidenceSourceLabel(response.input_type, item.image_index)} · {signalLabels[item.signal_type]}
              </AppText>
              <AppText variant="control">“{item.quote}”</AppText>
              <AppText tone="muted">{item.reason}</AppText>
            </View>
          ))}
        </ResultSection>
      )}

      {response.detected_urls.length > 0 && (
        <ResultSection title="Đường dẫn phát hiện">
          <AppText variant="secondary" tone="muted">
            Các dấu hiệu dưới đây mô tả cấu trúc đường dẫn. Độ an toàn của đường dẫn chưa được xác minh.
          </AppText>
          {response.detected_urls.map(({ url, signals }, index) => (
            <View key={index} style={styles.divided}>
              <AppText textBreakStrategy="simple">{url}</AppText>
              {signals.length > 0 ? (
                <AppText variant="secondary" tone="muted">
                  {signals.map((signal) => urlSignalLabels[signal]).join('\n')}
                </AppText>
              ) : (
                <AppText variant="secondary" tone="muted">Chưa thấy dấu hiệu cấu trúc bất thường.</AppText>
              )}
            </View>
          ))}
        </ResultSection>
      )}

      <ResultSection title="Tóm tắt ngắn">
        <AppText>{response.speech_summary}</AppText>
      </ResultSection>

      <Button label="Về trang chủ" variant="secondary" onPress={onHome} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  compactGroup: { gap: spacing.xs },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  grow: { flex: 1 },
  action: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
});
