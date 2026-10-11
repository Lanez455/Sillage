import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useBikes } from '@/hooks/garage';
import { usePilotStats, useProfile } from '@/hooks/profile';
import { formatNumber } from '@/lib/format';
import { levelFromXp, nextRank, RANKS, rankForLevel, XP_RULES } from '@/lib/gamification';
import { colors, font, radius, space } from '@/lib/theme';
import { BikeTile } from './BikeTile';
import { PilotCard } from './PilotCard';
import { TrophyGrid } from './Trophies';
import { Body, Card, ErrorView, Label, Loading } from './ui';

/** Profil de pilote : carte, progression de rang, trophées, garage. */
export function PilotView({ userId, header, footer, showRules }: { userId: string; header?: ReactNode; footer?: ReactNode; showRules?: boolean }) {
  const profile = useProfile(userId);
  const stats = usePilotStats(userId);
  const bikes = useBikes(userId);

  if (profile.isPending || stats.isPending) return <Loading />;
  if (profile.isError) return <ErrorView error={profile.error} onRetry={profile.refetch} />;
  if (stats.isError) return <ErrorView error={stats.error} onRetry={stats.refetch} />;

  const lvl = levelFromXp(stats.data.xp);
  const rank = rankForLevel(lvl.level);
  const next = nextRank(lvl.level);

  const refresh = () => {
    profile.refetch();
    stats.refetch();
    bikes.refetch();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={stats.isRefetching} onRefresh={refresh} tintColor={colors.accent} />}
    >
      <PilotCard profile={profile.data} stats={stats.data} bike={bikes.data?.[0]} />

      {profile.data.bio ? <Body muted>{profile.data.bio}</Body> : null}

      {header}

      <View style={{ gap: space.md }}>
        <Label>Carrière</Label>
        <Card style={{ gap: space.md }}>
          <View style={styles.ladder}>
            {RANKS.map((r) => {
              const reached = lvl.level >= r.minLevel;
              return (
                <View key={r.id} style={styles.rung}>
                  <View
                    style={[
                      styles.rungBar,
                      { backgroundColor: reached ? r.color : colors.surface3 },
                      r.id === rank.id && styles.rungCurrent,
                    ]}
                  />
                  <Text style={[styles.rungLabel, { color: reached ? colors.text : colors.faint }]} numberOfLines={1}>
                    {r.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.tagline}>
            <Text style={{ color: rank.color, fontWeight: '900' }}>{rank.label}</Text> — {rank.tagline}
          </Text>
          {next && (
            <Body muted style={{ fontSize: 13 }}>
              Prochain rang : {next.label} au niveau {next.minLevel}.
            </Body>
          )}
        </Card>
      </View>

      <View style={{ gap: space.md }}>
        <Label>Trophées</Label>
        <TrophyGrid stats={stats.data} />
      </View>

      {showRules && (
        <View style={{ gap: space.md }}>
          <Label>Comment gagner de l’XP</Label>
          <Card style={{ gap: space.sm }}>
            {XP_RULES.map((r) => (
              <View key={r.label} style={styles.rule}>
                <Body style={{ flex: 1, fontSize: 14 }}>{r.label}</Body>
                <Text style={styles.ruleXp}>{r.xp} XP</Text>
              </View>
            ))}
            <Body muted style={{ fontSize: 12, marginTop: space.xs }}>
              L’XP est comptée une fois la sortie passée. Total actuel : {formatNumber(stats.data.xp)} XP.
            </Body>
          </Card>
        </View>
      )}

      {!!bikes.data?.length && (
        <View style={{ gap: space.md }}>
          <Label>Garage</Label>
          {bikes.data.map((b) => (
            <BikeTile key={b.id} bike={b} />
          ))}
        </View>
      )}

      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.xl, paddingBottom: space.xxl },
  ladder: { flexDirection: 'row', gap: 4 },
  rung: { flex: 1, gap: 6 },
  rungBar: { height: 8, borderRadius: radius.sm },
  rungCurrent: { height: 12, marginTop: -2 },
  rungLabel: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center' },
  tagline: { color: colors.text, fontSize: 15 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  ruleXp: { color: colors.gold, fontWeight: '900', ...font.mono },
});
