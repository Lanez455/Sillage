import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { colors, font, radius, space } from '@/lib/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon(props: { name: IconName; size?: number; color?: ComponentProps<typeof MaterialCommunityIcons>['color'] }) {
  return <MaterialCommunityIcons name={props.name} size={props.size ?? 20} color={props.color ?? colors.text} />;
}

export function Title({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style }: PropsWithChildren<{ style?: StyleProp<TextStyle> }>) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

export function Body({ children, style, muted }: PropsWithChildren<{ style?: StyleProp<TextStyle>; muted?: boolean }>) {
  return <Text style={[styles.body, muted && { color: colors.muted }, style]}>{children}</Text>;
}

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style }: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.surface3 : variant === 'danger' ? '#3A1214' : 'transparent';
  const fg = variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.line },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={fg} />}
          <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; hint?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.faint}
        selectionColor={colors.accent}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const c = color ?? colors.accent;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active ? { backgroundColor: c, borderColor: c } : { borderColor: colors.line },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '26', borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Stat({ label, value, icon }: { label: string; value: string; icon?: IconName }) {
  return (
    <View style={styles.stat}>
      {icon && <Icon name={icon} size={18} color={colors.accent} />}
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

export function Empty({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
      <Icon name={icon} size={48} color={colors.faint} />
      <Text style={[styles.title, { fontSize: 20, textAlign: 'center' }]}>{title}</Text>
      {text ? <Body muted style={{ textAlign: 'center' }}>{text}</Body> : null}
      {action}
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Erreur inconnue';
  return (
    <Empty
      icon="alert-circle-outline"
      title="Impossible de charger"
      text={msg}
      action={onRetry ? <Button title="Réessayer" variant="secondary" onPress={onRetry} /> : undefined}
    />
  );
}

export function Avatar({ uri, size = 40, number }: { uri: string | null; size?: number; number?: number | null }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{number ?? '?'}</Text>
      )}
    </View>
  );
}

export const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 26, ...font.display },
  label: { color: colors.muted, ...font.label },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.faint, fontSize: 12 },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 15, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
  },
  badge: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: space.sm },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '900', fontStyle: 'italic', ...font.mono },
  statLabel: { color: colors.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarText: { color: colors.text, fontWeight: '900', fontStyle: 'italic' },
});
