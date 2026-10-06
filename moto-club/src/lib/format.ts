const dateFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const longFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatDate(iso: string | Date) {
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string | Date) {
  return timeFmt.format(new Date(iso));
}

export function formatLongDate(iso: string | Date) {
  const s = longFmt.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatKm(km: number | null | undefined) {
  if (km == null) return '—';
  return `${km.toLocaleString('fr-FR', { maximumFractionDigits: km < 100 ? 1 : 0 })} km`;
}

export function formatDuration(min: number | null | undefined) {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export function formatElevation(m: number | null | undefined) {
  if (m == null) return '—';
  return `${m.toLocaleString('fr-FR')} m`;
}

export function formatNumber(n: number) {
  return n.toLocaleString('fr-FR');
}

export function bikeName(bike: { brand: string; model: string } | null | undefined) {
  if (!bike) return 'Moto retirée du garage';
  return `${bike.brand} ${bike.model}`;
}

export function bikeSpecs(bike: {
  year?: number | null;
  displacement_cc?: number | null;
  mileage_km?: number | null;
}) {
  const parts: string[] = [];
  if (bike.year) parts.push(String(bike.year));
  if (bike.displacement_cc) parts.push(`${bike.displacement_cc} cm³`);
  if (bike.mileage_km != null) parts.push(`${formatNumber(bike.mileage_km)} km`);
  return parts.join(' · ');
}

/** Message lisible depuis une erreur Supabase/PostgREST ou JS. */
export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
    if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
    if (msg.includes('Email not confirmed')) return 'Confirme ton email avant de te connecter.';
    if (msg.includes('Password should be')) return 'Mot de passe trop court (6 caractères minimum).';
    if (msg.includes('duplicate key') && msg.includes('ride_participants'))
      return 'Tu es déjà inscrit à cette sortie.';
    if (msg.includes('Network request failed')) return 'Pas de connexion réseau.';
    return msg;
  }
  return 'Une erreur est survenue.';
}
