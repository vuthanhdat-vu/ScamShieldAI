export const MAX_IMAGES = 5;
export const BYTES_PER_MIB = 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * BYTES_PER_MIB;
export const MAX_TOTAL_IMAGE_BYTES = 20 * BYTES_PER_MIB;
export const MAX_CONTEXT_LENGTH = 1000;

export const screenshotFormats = {
  JPEG: { mime: 'image/jpeg', extension: 'jpg' },
  PNG: { mime: 'image/png', extension: 'png' },
  WebP: { mime: 'image/webp', extension: 'webp' },
} as const;

export type Screenshot = {
  uri: string;
  size: number;
  format: keyof typeof screenshotFormats;
};

export function detectImageFormat(header: Uint8Array) {
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return 'JPEG';
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => header[index] === byte)) {
    return 'PNG';
  }
  if ([0x52, 0x49, 0x46, 0x46].every((byte, index) => header[index] === byte) &&
      [0x57, 0x45, 0x42, 0x50].every((byte, index) => header[index + 8] === byte)) {
    return 'WebP';
  }
  return null;
}
