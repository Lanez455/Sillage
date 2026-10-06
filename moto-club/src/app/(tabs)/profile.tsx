import { Alert, View } from 'react-native';
import { PilotView } from '@/components/PilotView';
import { RideCard } from '@/components/RideCard';
import { Button, Label } from '@/components/ui';
import { useMyUpcomingRides } from '@/hooks/rides';
import { signOut } from '@/lib/auth';
import { space } from '@/lib/theme';
import { useUserId } from '@/providers/AuthProvider';

export default function ProfileScreen() {
  const me = useUserId();
  const upcoming = useMyUpcomingRides(me);

  return (
    <PilotView
      userId={me}
      showRules
      header={
        upcoming.data?.length ? (
          <View style={{ gap: space.md }}>
            <Label>Mes prochaines sorties</Label>
            {upcoming.data.map((r) => (
              <RideCard key={r.id} ride={r} />
            ))}
          </View>
        ) : null
      }
      footer={
        <Button
          title="Se déconnecter"
          variant="ghost"
          icon="logout"
          onPress={() =>
            Alert.alert('Se déconnecter ?', undefined, [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnexion', style: 'destructive', onPress: () => signOut() },
            ])
          }
        />
      }
    />
  );
}
