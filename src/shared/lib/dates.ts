/**
 * Utilidades de fechas. Las fechas "de solo día" se manejan como texto ISO "AAAA-MM-DD",
 * igual que las columnas DateOnly de Dataverse.
 */

const dateFormatter = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });

const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-09-07" (o "2026-09-07T00:00:00Z") → Date en hora local, sin correrse un día por la zona horaria. */
function parseIsoDate(isoDate: string): Date | null {
  const [year, month, day] = isoDate.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Formatea una fecha de solo día como "7 sept 2026". */
export function formatDate(isoDate: string | null | undefined): string {
  const date = isoDate ? parseIsoDate(isoDate) : null;
  return date ? dateFormatter.format(date) : '—';
}

/** Fecha de hoy en formato "AAAA-MM-DD" (hora local). */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Días corridos entre dos fechas de solo día. */
export function daysBetween(startIso: string, endIso: string): number {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Suma días hábiles (lunes a viernes) a una fecha de solo día. */
export function addBusinessDays(startIso: string, businessDays: number): string {
  const date = parseIsoDate(startIso) ?? new Date();
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) added++;
  }
  return toIsoDate(date);
}
