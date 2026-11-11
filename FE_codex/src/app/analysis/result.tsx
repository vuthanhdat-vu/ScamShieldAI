import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { AnalysisResultScreen } from '@/features/analysis/AnalysisResultScreen';
import { useEmergencyCategoryHandoff, useResultHandoff } from '@/features/analysis/AnalysisResultSession';

export default function AnalysisResultRoute() {
  const { demo } = useLocalSearchParams<{ demo?: string | string[] }>();
  const handoff = useResultHandoff();
  const emergencyCategory = useEmergencyCategoryHandoff();
  const [liveResponse] = useState(() => demo === undefined ? handoff.peek() : undefined);
  useEffect(() => {
    if (liveResponse) handoff.clear(liveResponse);
  }, [handoff, liveResponse]);

  const fixture = __DEV__ && demo !== undefined
    // Keep the fixture import inside the development branch for Metro's release build.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? (require('@/features/analysis/dev/resultFixtures') as typeof import('@/features/analysis/dev/resultFixtures'))
      .getResultFixture(demo)
    : undefined;
  const response = demo === undefined ? liveResponse : fixture;

  return (
    <AnalysisResultScreen
      key={response?.analysis_id}
      response={response}
      preview={__DEV__ && fixture ? (
        <Card>
          <AppText variant="control" tone="action">Dữ liệu mẫu · Chỉ dành cho phát triển</AppText>
        </Card>
      ) : undefined}
      onHome={() => router.dismissTo('/')}
      onEmergency={() => {
        if (demo === undefined && liveResponse) {
          emergencyCategory.stage({ target: 'selection', category: liveResponse.scam_category });
        }
        router.navigate('/emergency');
      }}
    />
  );
}
