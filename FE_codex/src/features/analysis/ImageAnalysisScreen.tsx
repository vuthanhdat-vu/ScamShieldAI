import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { analyzeImages } from '@/lib/api/imageAnalysis';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { BYTES_PER_MIB, MAX_CONTEXT_LENGTH, MAX_IMAGES, MAX_TOTAL_IMAGE_BYTES, type Screenshot } from './imageValidation';
import { inspectScreenshot, pickScreenshots, releasePickerCopy } from './screenshotPicker';
import { countContractCharacters } from './textValidation';
import { useAnalysisSubmission } from './useAnalysisSubmission';

const countFormat = new Intl.NumberFormat('vi-VN');
const sizeFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

function formatSize(bytes: number) {
  return bytes < BYTES_PER_MIB
    ? sizeFormat.format(bytes / 1024) + ' KiB'
    : sizeFormat.format(bytes / BYTES_PER_MIB) + ' MiB';
}

export function ImageAnalysisScreen() {
  const [images, setImages] = useState<Screenshot[]>([]);
  const [context, setContext] = useState('');
  const [contextFocused, setContextFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  const [pickerErrors, setPickerErrors] = useState<string[]>([]);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const { pending, requestError, clearError, cancel, submit } = useAnalysisSubmission(analyzeImages);
  const mounted = useRef(false);
  const pickerInFlight = useRef(false);
  const retainedUris = useRef(new Set<string>());

  useEffect(() => {
    mounted.current = true;
    const uris = retainedUris.current;
    return () => {
      mounted.current = false;
      uris.forEach(releasePickerCopy);
      uris.clear();
    };
  }, []);

  const contextLength = countContractCharacters(context);
  const contextInvalid = contextLength > MAX_CONTEXT_LENGTH;
  const totalBytes = images.reduce((total, image) => total + image.size, 0);
  const totalInvalid = totalBytes > MAX_TOTAL_IMAGE_BYTES;
  const canAnalyze = images.length > 0 && !totalInvalid && !contextInvalid &&
    failedPreviews.length === 0 && !picking && !pending;

  async function chooseImages() {
    const remaining = MAX_IMAGES - images.length;
    if (pickerInFlight.current || pending || remaining === 0) return;

    Keyboard.dismiss();
    pickerInFlight.current = true;
    setPicking(true);
    try {
      const result = await pickScreenshots(remaining);
      if (result.canceled) return;

      const accepted: Screenshot[] = [];
      const errors: string[] = [];
      for (const [index, asset] of result.assets.entries()) {
        if (retainedUris.current.has(asset.uri)) continue;

        if (!mounted.current || accepted.length >= remaining) {
          releasePickerCopy(asset.uri);
          if (mounted.current) errors.push('Chỉ có thể chọn tối đa 5 ảnh.');
          continue;
        }

        const inspected = await inspectScreenshot(asset.uri);
        if (!mounted.current || 'error' in inspected) {
          releasePickerCopy(asset.uri);
          if ('error' in inspected) errors.push(`Ảnh vừa chọn số ${index + 1} · ${inspected.error}`);
          continue;
        }
        retainedUris.current.add(asset.uri);
        accepted.push(inspected.image);
      }

      if (!mounted.current) return;
      setImages((previous) => [...previous, ...accepted]);
      setPickerErrors([...new Set(errors)]);
      clearError();
    } catch {
      if (mounted.current) {
        setPickerErrors(['Không mở được thư viện ảnh. Hãy thử lại hoặc kiểm tra quyền truy cập ảnh trong Cài đặt.']);
      }
    } finally {
      pickerInFlight.current = false;
      if (mounted.current) setPicking(false);
    }
  }

  function removeImage(uri: string) {
    setImages((previous) => previous.filter((image) => image.uri !== uri));
    setFailedPreviews((previous) => previous.filter((failed) => failed !== uri));
    retainedUris.current.delete(uri);
    releasePickerCopy(uri);
    clearError();
  }

  function moveImage(index: number, offset: -1 | 1) {
    setImages((previous) => {
      const target = index + offset;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    clearError();
  }

  function goBack() {
    cancel();
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function submitImages() {
    if (canAnalyze && !pickerInFlight.current) submit({ images, context });
  }

  return (
    <KeyboardAvoidingView style={styles.page} enabled={Platform.OS === 'ios'} behavior="padding">
      <Screen>
        <View style={styles.back}>
          <Button label="Quay lại" icon="arrow-left" variant="text" onPress={goBack} />
        </View>

        <View style={styles.group}>
          <AppText variant="screenTitle" accessibilityRole="header">Kiểm tra ảnh chụp màn hình</AppText>
          <AppText tone="muted">Chọn ảnh cuộc trò chuyện theo thứ tự từ cũ đến mới.</AppText>
        </View>

        <Card style={styles.group}>
          <AppText variant="sectionTitle" accessibilityRole="header">
            Ảnh đã chọn ({images.length}/{MAX_IMAGES})
          </AppText>
          <AppText variant="secondary" tone="muted">
            JPEG, PNG hoặc WebP. Tối đa 5 MiB mỗi ảnh và 20 MiB tổng cộng.
          </AppText>

          {images.map((image, index) => (
            <View style={styles.imageRow} key={image.uri}>
              <View style={styles.imageInfo}>
                <Image
                  source={{ uri: image.uri }}
                  style={styles.thumbnail}
                  resizeMode="contain"
                  accessible
                  accessibilityLabel={`Ảnh xem trước số ${index + 1}`}
                  onError={() => {
                    if (retainedUris.current.has(image.uri)) {
                      setFailedPreviews((previous) => previous.includes(image.uri)
                        ? previous
                        : [...previous, image.uri]);
                    }
                  }}
                />
                <View style={styles.imageCopy}>
                  <AppText variant="control">Ảnh {index + 1}</AppText>
                  <AppText variant="secondary" tone="muted">{image.format} · {formatSize(image.size)}</AppText>
                  {failedPreviews.includes(image.uri) && (
                    <AppText variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
                      Không xem được ảnh. Hãy bỏ ảnh này và chọn lại.
                    </AppText>
                  )}
                </View>
              </View>

              <View style={styles.imageActions}>
                {index > 0 && (
                  <Button label={`Đưa ảnh ${index + 1} lên`} variant="text"
                    onPress={() => moveImage(index, -1)} disabled={picking || pending} />
                )}
                {index < images.length - 1 && (
                  <Button label={`Đưa ảnh ${index + 1} xuống`} variant="text"
                    onPress={() => moveImage(index, 1)} disabled={picking || pending} />
                )}
                <Button label={`Bỏ ảnh ${index + 1}`} variant="text"
                  onPress={() => removeImage(image.uri)} disabled={picking || pending} />
              </View>
            </View>
          ))}

          {images.length > 0 && (
            <AppText variant="secondary" tone="muted">Tổng dung lượng {formatSize(totalBytes)}</AppText>
          )}
          {totalInvalid && (
            <AppText variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
              Tổng dung lượng vượt quá 20 MiB. Hãy bỏ bớt ảnh.
            </AppText>
          )}
          {pickerErrors.map((message) => (
            <AppText key={message} variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
              {message}
            </AppText>
          ))}
          {images.length < MAX_IMAGES && (
            <Button
              label={picking ? 'Đang chọn và kiểm tra ảnh…' : images.length ? 'Thêm ảnh' : 'Chọn ảnh'}
              icon="image-plus"
              variant="secondary"
              pending={picking}
              disabled={pending}
              onPress={chooseImages}
            />
          )}
        </Card>

        <View style={styles.group}>
          <AppText variant="control">Thông tin bổ sung (không bắt buộc)</AppText>
          <TextInput
            accessibilityLabel="Thông tin bổ sung, không bắt buộc"
            accessibilityHint="Tối đa 1.000 ký tự."
            autoComplete="off"
            multiline
            textAlignVertical="top"
            underlineColorAndroid="transparent"
            placeholder="Ví dụ, người gửi tự xưng là nhân viên ngân hàng."
            placeholderTextColor={colors.muted}
            selectionColor={colors.action}
            editable={!pending}
            value={context}
            onFocus={() => setContextFocused(true)}
            onBlur={() => setContextFocused(false)}
            onChangeText={(value) => {
              setContext(value);
              clearError();
            }}
            style={[styles.editor, contextFocused && styles.editorFocused, contextInvalid && styles.editorInvalid]}
          />
          <AppText variant="secondary" tone="muted" style={[styles.counter, contextInvalid && styles.error]}>
            {countFormat.format(contextLength)} / {countFormat.format(MAX_CONTEXT_LENGTH)} ký tự
          </AppText>
          {contextInvalid && (
            <AppText variant="secondary" style={styles.error} accessibilityLiveRegion="polite">
              Rút gọn thông tin bổ sung còn tối đa 1.000 ký tự.
            </AppText>
          )}
        </View>

        <View style={styles.privacy}>
          <Icon name="lock-outline" color={colors.action} size={20} />
          <AppText variant="secondary" tone="muted" style={styles.imageCopy}>
            Ảnh và thông tin bổ sung sẽ được gửi đến dịch vụ phân tích. Hãy che mã OTP, mật khẩu và thông tin cá nhân trước khi gửi.
          </AppText>
        </View>

        <View style={styles.group}>
          <Button
            label={pending ? 'Đang kiểm tra ảnh…' : 'Phân tích ảnh chụp màn hình'}
            icon="arrow-right"
            disabled={!canAnalyze}
            pending={pending}
            onPress={submitImages}
          />
          {pending && (
            <Card style={styles.notice}>
              <AppText tone="muted" accessibilityLiveRegion="polite">
                Đang gửi ảnh và chờ kết quả. Bạn có thể hủy để tiếp tục chỉnh sửa.
              </AppText>
              <Button label="Hủy yêu cầu" variant="secondary" onPress={cancel} />
            </Card>
          )}
          {requestError && (
            <Card style={styles.notice}>
              <AppText style={styles.error} accessibilityLiveRegion="polite">{requestError.message}</AppText>
              {requestError.requestId && (
                <AppText variant="secondary" tone="muted">Mã yêu cầu {requestError.requestId}</AppText>
              )}
              <Button label="Thử lại" variant="secondary" disabled={!canAnalyze} onPress={submitImages} />
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
  group: { gap: spacing.sm },
  imageRow: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, paddingTop: spacing.md },
  imageInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  imageCopy: { flex: 1 },
  thumbnail: { width: 72, height: 88, borderRadius: radii.control, backgroundColor: colors.supportSurface },
  imageActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  editor: {
    ...typography.body,
    height: 128,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radii.control,
    borderColor: colors.fieldBorder,
    backgroundColor: colors.surface,
    color: colors.ink,
  },
  editorFocused: { borderWidth: 2, borderColor: colors.focus, padding: spacing.lg - 1 },
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
  notice: { gap: spacing.sm, backgroundColor: colors.supportSurface, borderColor: colors.supportBorder },
});
