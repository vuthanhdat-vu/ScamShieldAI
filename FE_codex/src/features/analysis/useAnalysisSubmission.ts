import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';

import { ApiError } from '@/lib/api/apiError';
import { createRequestSubmission } from '@/lib/api/requestSubmission';

import { useResultHandoff } from './AnalysisResultSession';
import type { AnalysisResponse } from './analysisResult';

export function useAnalysisSubmission<Draft>(
  request: (draft: Draft, signal: AbortSignal) => Promise<AnalysisResponse>,
) {
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState<ApiError>();
  const [submission] = useState(() => createRequestSubmission(request));
  const handoff = useResultHandoff();

  useFocusEffect(useCallback(() => {
    setPending(false);
    return submission.cancel;
  }, [submission]));

  return {
    pending,
    requestError,
    clearError: () => setRequestError(undefined),
    cancel: () => {
      submission.cancel();
      setPending(false);
    },
    submit: (draft: Draft) => {
      void submission.submit(draft, {
        onPending: () => {
          Keyboard.dismiss();
          setRequestError(undefined);
          setPending(true);
        },
        onResult: (response) => {
          setPending(false);
          handoff.stage(response);
          try {
            router.push('/analysis/result');
          } catch {
            handoff.clear(response);
            setRequestError(new ApiError('invalidResponse'));
          }
        },
        onError: (failure) => {
          setPending(false);
          if (failure.kind !== 'cancelled') setRequestError(failure);
        },
      });
    },
  };
}
