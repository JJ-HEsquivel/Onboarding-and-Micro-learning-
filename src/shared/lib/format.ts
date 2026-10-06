const dateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Formatea una fecha de solo día ("2026-09-07" o "2026-09-07T00:00:00Z") como "7 sept 2026".
 * Se arma la fecha en hora local para que no se corra un día por la zona horaria.
 */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '—';
  return dateFormatter.format(new Date(year, month - 1, day));
}

/** Fecha de hoy en formato "AAAA-MM-DD" (hora local). */
export function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "Camila Rojas" → "CR". */
export function getInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/** Devuelve "1 documento" / "3 documentos". */
export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
