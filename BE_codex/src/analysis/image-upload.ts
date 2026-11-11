import type { Request, Response } from 'express';
import { validate } from 'class-validator';
import multer from 'multer';
import sharp from 'sharp';
import { ApiException } from '../common/http/api-exception';
import { ErrorCode } from '../contracts/error-code.enum';
import {
  type ImageMediaType, ImagesRequestDto, MAX_COMBINED_IMAGE_BYTES, MAX_IMAGE_BYTES,
  MAX_IMAGES, type UploadedImage,
} from './dto/images-request.dto';

const MAX_DECODED_PIXELS = 16_000_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const parseMultipart = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: MAX_IMAGES,
    fields: 1,
    parts: MAX_IMAGES + 1,
    fieldNameSize: 32,
    fieldNestingDepth: 0,
    fieldSize: 4_000, // Up to 4 UTF-8 bytes for each of 1000 characters.
  },
}).array('images', MAX_IMAGES);

export async function receiveImages(request: Request, response: Response): Promise<ImagesRequestDto> {
  if (!request.is('multipart/form-data')) {
    throw new ApiException(ErrorCode.INVALID_INPUT);
  }
  await new Promise<void>((resolve, reject) => {
    parseMultipart(request, response, (error: unknown) => {
      if (!error) {
        resolve();
      } else {
        const code = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
          ? ErrorCode.IMAGE_TOO_LARGE
          : ErrorCode.INVALID_INPUT;
        reject(new ApiException(code));
      }
    });
  });

  const files = Array.isArray(request.files) ? request.files : [];
  const body: Record<string, unknown> = request.body as Record<string, unknown>;
  if (files.length === 0 || Object.keys(body).some((key) => key !== 'context')) {
    throw new ApiException(ErrorCode.INVALID_INPUT);
  }
  if (files.reduce((total, file) => total + file.buffer.length, 0) > MAX_COMBINED_IMAGE_BYTES) {
    throw new ApiException(ErrorCode.IMAGE_TOO_LARGE);
  }

  const dto = Object.assign(new ImagesRequestDto(), { context: body.context, images: files });
  if ((await validate(dto)).length) {
    throw new ApiException(ErrorCode.INVALID_INPUT);
  }

  const images: UploadedImage[] = [];
  for (const file of files) {
    images.push(await validateImage(file.buffer));
  }
  return Object.assign(dto, { images });
}

function imageMediaType(bytes: Buffer): ImageMediaType | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
}

function hasUnsupportedSignature(bytes: Buffer): boolean {
  const prefix = bytes.toString('latin1', 0, 6);
  return prefix === 'GIF87a' || prefix === 'GIF89a' ||
    prefix.startsWith('BM') || prefix.startsWith('II*\0') || prefix.startsWith('MM\0*') ||
    bytes.toString('latin1', 4, 8) === 'ftyp' ||
    bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]));
}

export async function validateImage(bytes: Buffer): Promise<UploadedImage> {
  const mediaType = imageMediaType(bytes);
  if (!mediaType) {
    throw new ApiException(hasUnsupportedSignature(bytes)
      ? ErrorCode.UNSUPPORTED_IMAGE_FORMAT
      : ErrorCode.INVALID_IMAGE);
  }

  try {
    const image = sharp(bytes, {
      animated: true,
      failOn: 'warning',
      limitInputPixels: MAX_DECODED_PIXELS,
    });
    const metadata = await image.metadata();
    const pixels = metadata.width * (metadata.pageHeight ?? metadata.height) * (metadata.pages ?? 1);
    if (`image/${metadata.format}` !== mediaType || pixels > MAX_DECODED_PIXELS) {
      throw new ApiException(ErrorCode.INVALID_IMAGE);
    }
    await image.stats(); // Read pixel data so a valid header alone cannot pass.
  } catch {
    throw new ApiException(ErrorCode.INVALID_IMAGE);
  }

  return { bytes, mediaType };
}
