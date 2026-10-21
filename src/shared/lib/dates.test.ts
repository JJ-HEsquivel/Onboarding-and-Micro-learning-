import { describe, expect, it } from 'vitest';
import { addBusinessDays, addCalendarDays, daysBetween } from './dates';

describe('addBusinessDays', () => {
  it('salta sábados y domingos', () => {
    // 2026-10-23 es viernes: 1 día hábil después es el lunes 26.
    expect(addBusinessDays('2026-10-23', 1)).toBe('2026-10-26');
  });

  it('5 días hábiles desde un lunes terminan el lunes siguiente', () => {
    expect(addBusinessDays('2026-10-19', 5)).toBe('2026-10-26');
  });
});

describe('addCalendarDays', () => {
  it('cruza el fin de mes', () => {
    expect(addCalendarDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('daysBetween', () => {
  it('cuenta días corridos e ignora la hora', () => {
    expect(daysBetween('2026-10-01', '2026-10-21T15:30:00Z')).toBe(20);
  });
});
