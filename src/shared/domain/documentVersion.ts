/**
 * Reglas de versionado de documentos (funciones puras).
 *
 * Las versiones tienen el formato "MAYOR.MENOR" (ej. "1.0", "2.3"):
 * - Cambio MAYOR: cambia el contenido de fondo. Quien aún está en inducción debe volver a leerlo
 *   y a rendir su examen.
 * - Cambio MENOR: correcciones o aclaraciones. Solo se avisa a quienes lo tienen asignado.
 */

export type ChangeLevel = 'major' | 'minor';

const VERSION_PATTERN = /^(\d+)\.(\d+)$/;

export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version.trim());
}

function parseVersion(version: string): [number, number] | null {
  const match = VERSION_PATTERN.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2])] : null;
}

/** "1.4" + mayor → "2.0" · "1.4" + menor → "1.5". Si la versión actual no es válida, empieza en "1.0". */
export function nextVersion(current: string, level: ChangeLevel): string {
  const parsed = parseVersion(current);
  if (!parsed) return '1.0';
  const [major, minor] = parsed;
  return level === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

/** Compara dos versiones: negativo si a < b, 0 si son iguales, positivo si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a) ?? [0, 0];
  const pb = parseVersion(b) ?? [0, 0];
  return pa[0] - pb[0] || pa[1] - pb[1];
}
