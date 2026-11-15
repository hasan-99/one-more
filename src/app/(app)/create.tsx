import { useLocalSearchParams } from 'expo-router';

import { CreateGameWizard } from '@/features/matches/CreateGameWizard';

/** Creating a game and editing one share the same step-by-step flow. */
export default function CreateScreen() {
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  return <CreateGameWizard key={matchId ?? 'new'} matchId={matchId} />;
}
