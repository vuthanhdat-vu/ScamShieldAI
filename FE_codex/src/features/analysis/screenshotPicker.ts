import { File, FileMode, Paths } from 'expo-file-system';
import { launchImageLibraryAsync, UIImagePickerPreferredAssetRepresentationMode } from 'expo-image-picker';

import { detectImageFormat, MAX_IMAGE_BYTES, type Screenshot } from './imageValidation';

export function createScreenshotUploadFile(uri: string, name: string, mime: string): Blob {
  const file = new File(uri);
  // Expo fetch reads this URI-backed File directly. Override the part metadata without changing the file.
  return Object.defineProperties(file, {
    name: { value: name },
    type: { value: mime },
  });
}

export function pickScreenshots(limit: number) {
  return launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: limit,
    allowsEditing: false,
    quality: 1,
    base64: false,
    exif: false,
    preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Current,
  });
}

export async function inspectScreenshot(uri: string): Promise<
  { image: Screenshot } | { error: string; code: 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE' | 'UNSUPPORTED_IMAGE_FORMAT' }
> {
  try {
    const file = new File(uri);
    const handle = file.open(FileMode.ReadOnly);
    try {
      const size = handle.size ?? file.size;
      if (!Number.isSafeInteger(size) || size <= 0) {
        return { error: 'Không xác định được dung lượng. Hãy chọn lại ảnh.', code: 'INVALID_IMAGE' };
      }
      if (size > MAX_IMAGE_BYTES) return { error: 'Dung lượng vượt quá 5 MiB.', code: 'IMAGE_TOO_LARGE' };

      const format = detectImageFormat(await handle.readBytes(12));
      if (!format) {
        return { error: 'Hãy chọn ảnh JPEG, PNG hoặc WebP đọc được.', code: 'UNSUPPORTED_IMAGE_FORMAT' };
      }
      return { image: { uri, size, format } };
    } finally {
      handle.close();
    }
  } catch {
    return { error: 'Không đọc được tệp. Hãy thử chọn ảnh khác.', code: 'INVALID_IMAGE' };
  }
}

export function releasePickerCopy(uri: string) {
  // Only delete direct children of the picker cache. Gallery and provider URIs are untouched.
  const pickerCache = Paths.cache.uri.replace(/\/$/, '') + '/ImagePicker/';
  const name = uri.slice(pickerCache.length);
  if (!uri.startsWith(pickerCache) || !/^[\w-]+\.[\w]+$/.test(name)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Expo can reclaim the cache if the copy is no longer accessible here.
  }
}
