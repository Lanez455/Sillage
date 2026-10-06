import { router } from 'expo-router';
import { Alert } from 'react-native';
import { BikeForm } from '@/components/BikeForm';
import { useSaveBike } from '@/hooks/garage';
import { errorMessage } from '@/lib/format';
import { useUserId } from '@/providers/AuthProvider';

export default function NewBike() {
  const save = useSaveBike(useUserId());
  return (
    <BikeForm
      saving={save.isPending}
      onSubmit={(input, photoUri) =>
        save.mutate(
          { input, photoUri },
          {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Enregistrement impossible', errorMessage(e)),
          },
        )
      }
    />
  );
}
