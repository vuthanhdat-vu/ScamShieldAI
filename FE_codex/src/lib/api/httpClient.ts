import { ApiError, createBackendError } from './apiError.ts';
import { readRequestId } from './contracts.ts';

export const API_PREFIX = '/api/v1';
export const DEFAULT_API_TIMEOUT_MS = 60_000;

export type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

type JsonRequest = RequestOptions & (
  | { method?: 'GET'; json?: never }
  | { method: 'POST'; json: object }
);

type MultipartRequest = RequestOptions & { method: 'POST'; form: FormData };

type HttpClientConfig = {
  baseUrl: string | undefined;
  allowHttp?: boolean;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export function normalizeApiBaseUrl(value: string | undefined, allowHttp = false) {
  // Restrict config to a host origin or that origin with the documented v1 prefix.
  const match = /^(https?):\/\/([a-z\d.-]+)(?::(\d{1,5}))?(?:\/api\/v1)?\/*$/i.exec(value?.trim() ?? '');
  if (!match) throw new ApiError('configuration');
  const [, protocol, hostname, port] = match;
  const scheme = protocol.toLowerCase();
  if (scheme === 'http' && !allowHttp) throw new ApiError('configuration');
  if (!hostname.split('.').every((label) => /^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/i.test(label)) ||
      (port && (Number(port) < 1 || Number(port) > 65535))) {
    throw new ApiError('configuration');
  }
  return `${scheme}://${hostname}${port ? `:${port}` : ''}`;
}

function checkTimeout(timeoutMs: number) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2_147_483_647) {
    throw new ApiError('configuration');
  }
}

export function createHttpClient({
  baseUrl, allowHttp, timeoutMs = DEFAULT_API_TIMEOUT_MS, fetchImpl = fetch,
}: HttpClientConfig) {
  const origin = normalizeApiBaseUrl(baseUrl, allowHttp);
  checkTimeout(timeoutMs);

  async function request<T>(
    path: string,
    isResponse: (value: unknown) => value is T,
    options: JsonRequest | MultipartRequest,
  ): Promise<T> {
    // Only fixed endpoint paths are accepted. Response content must never become a request URL.
    if (!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path) || path.startsWith('/api/')) {
      throw new ApiError('invalidRequest');
    }
    const deadline = options.timeoutMs ?? timeoutMs;
    checkTimeout(deadline);
    const signal = options.signal;
    if (signal?.aborted) throw new ApiError('cancelled');

    const multipart = 'form' in options;
    let body: string | FormData | undefined;
    if (multipart) {
      body = options.form;
    } else if (options.method === 'POST') {
      try {
        body = JSON.stringify(options.json);
        if (body === undefined) throw new ApiError('invalidRequest');
      } catch {
        throw new ApiError('invalidRequest');
      }
    }

    const controller = new AbortController();
    let requestId: string | undefined;
    let stop: (error: ApiError) => void = () => {};
    const interrupted = new Promise<never>((_, reject) => { stop = reject; });
    function abort(kind: 'timeout' | 'cancelled') {
      if (controller.signal.aborted) return;
      stop(new ApiError(kind, { requestId }));
      controller.abort();
    }

    const cancel = () => abort('cancelled');
    signal?.addEventListener('abort', cancel);
    const timer = setTimeout(() => abort('timeout'), deadline);

    async function readResponse(): Promise<T> {
      let response: Response;
      try {
        response = await fetchImpl(`${origin}${API_PREFIX}${path}`, {
          method: options.method ?? 'GET',
          // The native transport adds the multipart Content-Type and its boundary.
          headers: typeof body === 'string'
            ? { Accept: 'application/json', 'Content-Type': 'application/json' }
            : { Accept: 'application/json' },
          body,
          signal: controller.signal,
          credentials: 'omit',
          redirect: 'error',
        });
      } catch {
        throw new ApiError('network');
      }

      if (controller.signal.aborted) throw new ApiError('cancelled');
      requestId = readRequestId(response.headers.get('X-Request-Id'));
      let raw: string;
      try {
        raw = await response.text();
      } catch {
        if (!response.ok) throw createBackendError(response.status, undefined, requestId);
        throw new ApiError('network', { statusCode: response.status, requestId });
      }
      if (controller.signal.aborted) throw new ApiError('cancelled');

      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        if (!response.ok) throw createBackendError(response.status, undefined, requestId);
        throw new ApiError('invalidResponse', { statusCode: response.status, requestId });
      }
      if (!response.ok) throw createBackendError(response.status, payload, requestId);
      if (!isResponse(payload)) {
        throw new ApiError('invalidResponse', { statusCode: response.status, requestId });
      }
      return payload;
    }

    try {
      return await Promise.race([interrupted, readResponse()]);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  }

  return {
    requestJson<T>(path: string, isResponse: (value: unknown) => value is T, options: JsonRequest = {}) {
      return request(path, isResponse, options);
    },
    requestMultipart<T>(
      path: string,
      isResponse: (value: unknown) => value is T,
      form: FormData,
      options: RequestOptions = {},
    ) {
      return request(path, isResponse, { ...options, method: 'POST', form });
    },
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;

export function createConfiguredHttpClient() {
  return createHttpClient({
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    allowHttp: typeof __DEV__ !== 'undefined' && __DEV__,
  });
}
