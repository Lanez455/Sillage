import { StyleSheet, Text, View } from 'react-native';
import { formatNumber } from '@/lib/format';
import { TIER_COLORS, trophyProgress } from '@/lib/gamification';
import { colors, radius, space } from '@/lib/theme';
import type { PilotStats } from '@/lib/types';
import { Icon, type IconName } from './ui';

export function TrophyGrid({ stats }: { stats: PilotStats }) {
  const items = trophyProgress(stats).sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.ratio - a.ratio);
  return (
    <View style={styles.grid}>
      {items.map(({ trophy, unlocked, value, ratio }) => {
        const tier = TIER_COLORS[trophy.tier];
        return (
          <View key={trophy.id} style={[styles.item, unlocked && { borderColor: tier }]}>
            <View style={[styles.icon, { backgroundColor: unlocked ? tier + '33' : colors.surface2 }]}>
              <Icon name={trophy.icon as IconName} size={26} color={unlocked ? tier : colors.faint} />
            </View>
            <Text style={[styles.title, !unlocked && { color: colors.muted }]} numberOfLines={1}>
              {trophy.title}
            </Text>
            <Text style={styles.desc} numberOfLines={2}>
              {trophy.description}
            </Text>
            {!unlocked && (
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
              </View>
            )}
            <Text style={styles.progress}>
              {unlocked ? 'Débloqué' : `${formatNumber(Math.floor(value))} / ${formatNumber(trophy.goal)}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  item: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: 4,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { color: colors.text, fontSize: 14, fontWeight: '800' },
  desc: { color: colors.faint, fontSize: 12, minHeight: 32 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.surface3, overflow: 'hidden', marginTop: 4 },
  fill: { height: 4, backgroundColor: colors.accent },
  progress: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 2 },
});
