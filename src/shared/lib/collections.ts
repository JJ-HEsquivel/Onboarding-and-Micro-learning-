/**
 * Qué hay que agregar y qué quitar para pasar de `current` a `desired`.
 * Útil para sincronizar tablas intermedias (ej. las áreas de una etapa).
 *
 * @example
 * diffSets(new Set(['a', 'b']), new Set(['b', 'c'])) // → { toAdd: ['c'], toRemove: ['a'] }
 */
export function diffSets<T>(current: Set<T>, desired: Set<T>): { toAdd: T[]; toRemove: T[] } {
  return {
    toAdd: [...desired].filter((item) => !current.has(item)),
    toRemove: [...current].filter((item) => !desired.has(item)),
  };
}
