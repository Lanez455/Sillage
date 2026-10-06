import { router, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { Icon } from '@/components/ui';
import { colors, space } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '900', fontStyle: 'italic', fontSize: 22 },
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 11 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sorties',
          tabBarIcon: ({ color, size }) => <Icon name="road-variant" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garage',
          tabBarIcon: ({ color, size }) => <Icon name="garage-variant" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Pilote',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/profile/edit')}
              hitSlop={12}
              style={{ marginRight: space.lg }}
              accessibilityLabel="Modifier mon profil"
            >
              <Icon name="account-edit" />
            </Pressable>
          ),
          tabBarIcon: ({ color, size }) => <Icon name="racing-helmet" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
