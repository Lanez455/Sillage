import { useLocalSearchParams } from 'expo-router';
import { PilotView } from '@/components/PilotView';

export default function PilotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PilotView userId={id} />;
}
