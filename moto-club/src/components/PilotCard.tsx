import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { bikeName, formatNumber } from '@/lib/format';
import { levelFromXp, MAX_LEVEL, rankForLevel, trophyProgress } from '@/lib/gamification';
import { publicUrl } from '@/lib/photos';
import { colors, font, radius, space } from '@/lib/theme';
import type { Bike, PilotStats, Profile } from '@/lib/types';
import { Avatar } from './ui';

/** Carte de pilote façon fiche officielle de Grand Prix. */
export function PilotCard({ profile, stats, bike }: { profile: Profile; stats: PilotStats; bike?: Bike | null }) {
  const lvl = levelFromXp(stats.xp);
  const rank = rankForLevel(lvl.level);
  const trophies = trophyProgress(stats).filter((t) => t.unlocked).length;

  return (
    <LinearGradient
      colors={[rank.color + '55', colors.surface, '#0B0B0D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.bigNumber}>{profile.race_number ?? '--'}</Text>

      <View style={styles.header}>
        <Avatar uri={publicUrl('avatars', profile.avatar_path)} number={profile.race_number} size={84} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.rank, { color: rank.color }]}>{rank.label}</Text>
          <Text style={styles.pseudo} numberOfLines={1}>
            {profile.pseudo}
          </Text>
          {profile.city ? <Text style={styles.sub}>{profile.city}</Text> : null}
        </View>
      </View>

      <View style={styles.levelRow}>
        <View style={[styles.levelBox, { borderColor: rank.color }]}>
          <Text style={styles.levelLabel}>NIV</Text>
          <Text style={styles.levelValue}>{lvl.level}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(lvl.progress * 100)}%`, backgroundColor: rank.color }]} />
          </View>
          <Text style={styles.sub}>
            {formatNumber(stats.xp)} XP
            {lvl.level < MAX_LEVEL ? ` · encore ${formatNumber(lvl.toNext)} XP pour le niveau ${lvl.level + 1}` : ' · niveau max'}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <CardStat value={formatNumber(stats.rides_done)} label="Sorties" />
        <CardStat value={formatNumber(Math.round(stats.km_total))} label="Km" />
        <CardStat value={formatNumber(stats.circuit_days)} label="Circuits" />
        <CardStat value={String(trophies)} label="Trophées" />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>MACHINE</Text>
        <Text style={styles.footerValue} numberOfLines={1}>
          {bike ? bikeName(bike) : 'Garage vide'}
        </Text>
      </View>
    </LinearGradient>
  );
}

function CardStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.lg,
    overflow: 'hidden',
  },
  bigNumber: {
    position: 'absolute',
    right: -6,
    top: -24,
    fontSize: 150,
    color: '#FFFFFF10',
    ...font.display,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  rank: { ...font.label, fontSize: 12 },
  pseudo: { color: colors.text, fontSize: 28, ...font.display },
  sub: { color: colors.muted, fontSize: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  levelBox: {
    width: 62,
    height: 62,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0006',
  },
  levelLabel: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  levelValue: { color: colors.text, fontSize: 26, ...font.display, ...font.mono },
  xpTrack: { height: 8, borderRadius: 4, backgroundColor: '#FFFFFF1A', overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFFFFF1A',
    paddingVertical: space.md,
  },
  statValue: { color: colors.text, fontSize: 20, ...font.display, ...font.mono },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  footerLabel: { color: colors.accent, ...font.label },
  footerValue: { color: colors.text, fontSize: 15, fontWeight: '800', flex: 1 },
});
