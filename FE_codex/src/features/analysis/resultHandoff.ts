import type { AnalysisResponse } from './analysisResult';

export function createResultHandoff<Value = AnalysisResponse>() {
  let pending: Value | undefined;

  return {
    stage(response: Value) {
      pending = response;
    },
    peek() {
      return pending;
    },
    clear(response: Value) {
      if (pending === response) pending = undefined;
    },
  };
}
