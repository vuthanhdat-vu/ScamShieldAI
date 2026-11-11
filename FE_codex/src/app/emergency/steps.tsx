import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';

import { useEmergencyCategory } from '@/features/analysis/AnalysisResultSession';
import { EmergencyStepsScreen } from '@/features/guidance/EmergencyStepsScreen';
import { readEmergencyScenario, type EmergencyScenario } from '@/features/guidance/emergencyGuidance';
import type { ApiError } from '@/lib/api/apiError';
import type { EmergencyResponse, ScamCategory } from '@/lib/api/contracts';
import { getEmergencyGuidance } from '@/lib/api/emergency';
import { createRequestSubmission } from '@/lib/api/requestSubmission';

type LoadState =
  | { status: 'pending' }
  | { status: 'ready'; response: EmergencyResponse }
  | { status: 'error'; error: ApiError };

function LiveEmergencySteps({ scenario, category, onBack }: {
  scenario: EmergencyScenario;
  category?: ScamCategory;
  onBack: () => void;
}) {
  const [state, setState] = useState<LoadState>({ status: 'pending' });
  const [submission] = useState(() => createRequestSubmission(getEmergencyGuidance));
  const load = useCallback(() => {
    void submission.submit({ scenario, scam_category: category }, {
      onPending: () => setState({ status: 'pending' }),
      onResult: (response) => setState({ status: 'ready', response }),
      onError: (error) => setState({ status: 'error', error }),
    });
  }, [category, scenario, submission]);

  useFocusEffect(useCallback(() => {
    load();
    return submission.cancel;
  }, [load, submission]));

  return (
    <EmergencyStepsScreen
      scenario={scenario}
      response={state.status === 'ready' ? state.response : undefined}
      pending={state.status === 'pending'}
      error={state.status === 'error' ? state.error : undefined}
      onRetry={load}
      preview={false}
      onBack={() => {
        submission.cancel();
        onBack();
      }}
    />
  );
}

export default function EmergencyStepsRoute() {
  const { scenario: rawScenario, demo } = useLocalSearchParams<{
    scenario?: string | string[];
    demo?: string | string[];
  }>();
  const scenario = readEmergencyScenario(rawScenario);
  const preview = __DEV__ && demo === '1';
  const category = useEmergencyCategory('steps');
  const onBack = () => router.dismissTo({
    pathname: '/emergency',
    params: preview ? { demo: '1' } : {},
  });

  if (!preview && scenario) {
    return <LiveEmergencySteps key={scenario} scenario={scenario} category={category} onBack={onBack} />;
  }

  const response = preview && scenario
    // Keep the fixture import inside the development branch for Metro.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? (require('@/features/guidance/dev/emergencyFixtures') as typeof import('@/features/guidance/dev/emergencyFixtures'))
      .getEmergencyFixture(scenario)
    : undefined;

  return (
    <EmergencyStepsScreen
      scenario={scenario}
      response={response}
      preview={preview}
      onBack={onBack}
    />
  );
}
