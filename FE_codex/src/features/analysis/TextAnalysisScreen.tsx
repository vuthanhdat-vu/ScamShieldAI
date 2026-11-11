import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { analyzeText } from '@/lib/api/textAnalysis';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { TEXT_CHARACTER_LIMIT, validateAnalysisText } from './textValidation';
import { useAnalysisSubmission } from './useAnalysisSubmission';

const numberFormat = new Intl.NumberFormat('vi-VN');

export function TextAnalysisScreen() {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const { pending, requestError, clearError, cancel, submit } = useAnalysisSubmission(analyzeText);
  const { length, error } = validateAnalysisText(draft);

  const tooLong = error === 'tooLong';
  const message = tooLong
    ? 'Rút gọn tin nhắn còn tối đa 5.000 ký tự.'
    : error === 'empty' && (hasBlurred || draft.length > 0)
      ? 'Nhập hoặc dán tin nhắn để tiếp tục.'
      : null;

  function goBack() {
    cancel();
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  function handleAnalysisPress() {
    if (!error) submit(draft);
  }

  return (
    <KeyboardAvoidingView
      style={styles.page}
      enabled={Platform.OS === 'ios'}
      behavior="padding">
      <Screen>
        <View style={styles.back}>
          <Button label="Quay lại" icon="arrow-left" variant="text" onPress={goBack} />
        </View>

        <View style={styles.heading}>
          <AppText variant="screenTitle" accessibilityRole="header">Kiểm tra tin nhắn</AppText>
          <AppText tone="muted">Dán hoặc nhập tin nhắn đáng ngờ. Bạn có thể nhập nhiều dòng.</AppText>
        </View>

        <View style={styles.field}>
          <AppText variant="control">Nội dung tin nhắn</AppText>
          <TextInput
            accessibilityLabel="Nội dung tin nhắn"
            accessibilityHint="Nhấn giữ trong ô để dán nội dung. Tối đa 5.000 ký tự."
            multiline
            autoComplete="off"
            autoCorrect={false}
            placeholder="Dán hoặc nhập tin nhắn tại đây"
            placeholderTextColor={colors.muted}
            selectionColor={colors.action}
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            editable={!pending}
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              clearError();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              setHasBlurred(true);
            }}
            style={[styles.editor, focused && styles.editorFocused, message && styles.editorInvalid]}
          />
          <AppText variant="secondary" tone="muted" style={[styles.counter, tooLong && styles.error]}>
            {numberFormat.format(length)} / {numberFormat.format(TEXT_CHARACTER_LIMIT)} ký tự
          </AppText>
          {message && (
            <AppText variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
              {message}
            </AppText>
          )}
        </View>

        <View style={styles.privacy}>
          <Icon name="lock-outline" color={colors.action} size={20} />
          <AppText variant="secondary" tone="muted" style={styles.privacyCopy}>
            Tin nhắn sẽ được gửi đến dịch vụ phân tích. Hãy bỏ mã OTP, mật khẩu và thông tin cá nhân trước khi gửi.
          </AppText>
        </View>

        <View style={styles.actions}>
          <Button
            label={pending ? 'Đang kiểm tra tin nhắn…' : 'Phân tích tin nhắn'}
            icon="arrow-right"
            disabled={error !== null}
            pending={pending}
            onPress={handleAnalysisPress}
          />
          {pending && (
            <Card style={styles.notice}>
              <AppText tone="muted" accessibilityLiveRegion="polite">
                Đang chờ kết quả. Bạn có thể hủy và tiếp tục chỉnh sửa tin nhắn.
              </AppText>
              <Button label="Hủy yêu cầu" variant="secondary" onPress={cancel} />
            </Card>
          )}
          {requestError && (
            <Card style={styles.notice}>
              <AppText style={styles.error} accessibilityLiveRegion="polite">
                {requestError.message}
              </AppText>
              {requestError.requestId && (
                <AppText variant="secondary" tone="muted">Mã yêu cầu {requestError.requestId}</AppText>
              )}
              <Button label="Thử lại" variant="secondary" disabled={error !== null}
                onPress={handleAnalysisPress} />
            </Card>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  back: { alignSelf: 'flex-start' },
  heading: { gap: spacing.sm },
  field: { gap: spacing.sm },
  editor: {
    ...typography.body,
    height: 208,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.fieldBorder,
    borderRadius: radii.control,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  editorFocused: { borderColor: colors.focus, borderWidth: 2, padding: spacing.lg - 1 },
  editorInvalid: { borderColor: colors.errorInk },
  counter: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  error: { color: colors.errorInk },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.actionSurface,
  },
  privacyCopy: { flex: 1 },
  actions: { gap: spacing.md },
  notice: { gap: spacing.sm, backgroundColor: colors.supportSurface, borderColor: colors.supportBorder },
});
