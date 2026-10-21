import { describe, expect, it } from 'vitest';
import { compareVersions, isValidVersion, nextVersion } from './documentVersion';

describe('nextVersion', () => {
  it('un cambio mayor sube el primer número y reinicia el segundo', () => {
    expect(nextVersion('1.4', 'major')).toBe('2.0');
  });

  it('un cambio menor sube el segundo número', () => {
    expect(nextVersion('1.4', 'minor')).toBe('1.5');
  });

  it('con una versión inválida empieza en 1.0', () => {
    expect(nextVersion('borrador', 'minor')).toBe('1.0');
  });
});

describe('compareVersions', () => {
  it('compara como números, no como texto', () => {
    expect(compareVersions('1.10', '1.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0', '10.0')).toBeLessThan(0);
    expect(compareVersions('3.1', '3.1')).toBe(0);
  });
});

describe('isValidVersion', () => {
  it.each(['1.0', '12.34', ' 2.5 '])('acepta %s', (version) => expect(isValidVersion(version)).toBe(true));
  it.each(['2', '1.0.0', 'v1.0', ''])('rechaza %s', (version) => expect(isValidVersion(version)).toBe(false));
});
