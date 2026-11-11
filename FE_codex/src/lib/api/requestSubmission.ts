import { ApiError } from './apiError.ts';

type SubmissionCallbacks<Result> = {
  onPending: () => void;
  onResult: (response: Result) => void;
  onError: (error: ApiError) => void;
};

export function createRequestSubmission<Draft, Result>(
  request: (draft: Draft, signal: AbortSignal) => Promise<Result>,
) {
  let active: AbortController | undefined;

  return {
    async submit(draft: Draft, callbacks: SubmissionCallbacks<Result>) {
      if (active) return;
      const attempt = new AbortController();
      active = attempt;
      callbacks.onPending();
      let response: Result;
      try {
        response = await request(draft, attempt.signal);
      } catch (error) {
        if (active !== attempt) return;
        active = undefined;
        callbacks.onError(error instanceof ApiError ? error : new ApiError('invalidResponse'));
        return;
      }
      if (active !== attempt) return;
      active = undefined;
      callbacks.onResult(response);
    },
    cancel() {
      const attempt = active;
      active = undefined;
      attempt?.abort();
    },
  };
}
