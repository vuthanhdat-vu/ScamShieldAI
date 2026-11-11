import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import type { AnalysisResponse, ScamCategory } from './analysisResult';
import { createResultHandoff } from './resultHandoff';

const ResultSession = createContext<ReturnType<typeof createResultHandoff<AnalysisResponse>> | null>(null);
type CategoryTarget = 'selection' | 'steps';
type CategoryTransfer = { target: CategoryTarget; category: ScamCategory };
const EmergencyCategorySession = createContext<ReturnType<typeof createResultHandoff<CategoryTransfer>> | null>(null);

export function AnalysisResultSession({ children }: PropsWithChildren) {
  const [handoff] = useState(createResultHandoff<AnalysisResponse>);
  const [categoryHandoff] = useState(createResultHandoff<CategoryTransfer>);
  return (
    <ResultSession.Provider value={handoff}>
      <EmergencyCategorySession.Provider value={categoryHandoff}>{children}</EmergencyCategorySession.Provider>
    </ResultSession.Provider>
  );
}

export function useResultHandoff() {
  const handoff = useContext(ResultSession);
  if (!handoff) throw new Error('Analysis result session is unavailable.');
  return handoff;
}

export function useEmergencyCategoryHandoff() {
  const handoff = useContext(EmergencyCategorySession);
  if (!handoff) throw new Error('Emergency category session is unavailable.');
  return handoff;
}

export function useEmergencyCategory(target: CategoryTarget) {
  const handoff = useEmergencyCategoryHandoff();
  const [transfer] = useState(() => {
    const pending = handoff.peek();
    return pending?.target === target ? pending : undefined;
  });
  useEffect(() => {
    if (transfer) handoff.clear(transfer);
  }, [handoff, transfer]);
  return transfer?.category;
}
