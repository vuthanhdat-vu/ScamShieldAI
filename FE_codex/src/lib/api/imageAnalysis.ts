import { isAnalysisResponse } from '../../features/analysis/analysisResult.ts';
import {
  MAX_CONTEXT_LENGTH, MAX_IMAGES, MAX_IMAGE_BYTES, MAX_TOTAL_IMAGE_BYTES, screenshotFormats, type Screenshot,
} from '../../features/analysis/imageValidation.ts';
import type { createScreenshotUploadFile, inspectScreenshot } from '../../features/analysis/screenshotPicker.ts';
import { countContractCharacters } from '../../features/analysis/textValidation.ts';
import { ApiError } from './apiError.ts';
import type { AnalysisResponse } from './contracts.ts';
import { createConfiguredHttpClient, DEFAULT_API_TIMEOUT_MS, type HttpClient } from './httpClient.ts';

export type ImageAnalysisDraft = {
  images: readonly Screenshot[];
  context?: string;
};

type Dependencies = {
  client?: HttpClient;
  fileAccess?: {
    inspectScreenshot: typeof inspectScreenshot;
    createScreenshotUploadFile: typeof createScreenshotUploadFile;
  };
  createFormData?: () => FormData;
};

function validateFiles(images: readonly Screenshot[]) {
  let total = 0;
  for (const { uri, size, format } of images) {
    if (!/^(file:\/\/\/|content:\/\/)/.test(uri) || !Number.isSafeInteger(size) || size <= 0) {
      throw new ApiError('invalidRequest', { errorCode: 'INVALID_IMAGE' });
    }
    if (!Object.hasOwn(screenshotFormats, format)) {
      throw new ApiError('invalidRequest', { errorCode: 'UNSUPPORTED_IMAGE_FORMAT' });
    }
    if (size > MAX_IMAGE_BYTES) throw new ApiError('invalidRequest', { errorCode: 'IMAGE_TOO_LARGE' });
    total += size;
  }
  if (total > MAX_TOTAL_IMAGE_BYTES) throw new ApiError('invalidRequest', { errorCode: 'IMAGE_TOO_LARGE' });
}

function checkCancellation(signal?: AbortSignal) {
  if (signal?.aborted) throw new ApiError('cancelled');
}

export async function analyzeImages(
  { images, context }: ImageAnalysisDraft,
  signal?: AbortSignal,
  dependencies: Dependencies = {},
): Promise<AnalysisResponse> {
  checkCancellation(signal);
  const selected = [...images];
  if (selected.length === 0 || selected.length > MAX_IMAGES ||
      (context !== undefined && countContractCharacters(context) > MAX_CONTEXT_LENGTH)) {
    throw new ApiError('invalidRequest');
  }
  validateFiles(selected);

  const { inspectScreenshot: inspect, createScreenshotUploadFile: createFile } =
    dependencies.fileAccess ?? await import('../../features/analysis/screenshotPicker.ts');
  const verified: Screenshot[] = [];
  for (const { uri } of selected) {
    checkCancellation(signal);
    const result = await inspect(uri);
    checkCancellation(signal);
    if ('error' in result) throw new ApiError('invalidRequest', { errorCode: result.code });
    verified.push(result.image);
  }
  validateFiles(verified);

  const form = dependencies.createFormData?.() ?? new FormData();
  verified.forEach(({ uri, format }, index) => {
    const { mime, extension } = screenshotFormats[format];
    form.append('images', createFile(uri, `screenshot-${index + 1}.${extension}`, mime));
  });
  if (context !== undefined && context.length > 0) form.append('context', context);

  const client = dependencies.client ?? createConfiguredHttpClient();
  return client.requestMultipart('/analysis/images', (value): value is AnalysisResponse =>
    isAnalysisResponse(value) && value.input_type === 'IMAGE' &&
    value.evidence.every(({ image_index }) => image_index === null || image_index < verified.length),
  form, { timeoutMs: DEFAULT_API_TIMEOUT_MS, signal });
}
