import { describe, expect, it } from 'vitest';
import { attentionReasons, type AttentionInput } from './attention';

const base: AttentionInput = {
  status: 'inProgress',
  managerName: 'Iván Suárez',
  items: [],
  lastActivity: '2026-10-20',
  activeSince: '2026-10-01',
  today: '2026-10-21',
  maxAttempts: 3,
  inactivityDays: 3,
};

describe('attentionReasons', () => {
  it('una validación pendiente nombra al Manager responsable', () => {
    expect(attentionReasons({ ...base, status: 'pendingValidation' })).toEqual(['Pendiente de validación de Iván Suárez']);
  });

  it('una inducción completada no requiere atención', () => {
    expect(attentionReasons({ ...base, status: 'completed', lastActivity: '2026-01-01' })).toEqual([]);
  });

  it('cuenta las lecturas vencidas', () => {
    const overdue = { isRead: false, dueDate: '2026-10-10', exam: null, documentTitle: 'BYOD' };
    expect(attentionReasons({ ...base, items: [overdue, overdue] })).toContain('2 lectura(s) vencida(s)');
  });

  it('distingue un examen reprobado de uno con intentos agotados', () => {
    const failed = (attemptsUsed: number, documentTitle: string) => ({
      isRead: true,
      dueDate: null,
      exam: { status: 'failed' as const, score: 50, attemptsUsed, dueDate: null },
      documentTitle,
    });
    const reasons = attentionReasons({ ...base, items: [failed(1, 'Código de ética'), failed(3, 'BYOD')] });
    expect(reasons).toEqual(['Reprobó Código de ética', 'Intentos agotados en BYOD']);
  });

  it('avisa la inactividad desde la última actividad', () => {
    expect(attentionReasons({ ...base, lastActivity: '2026-10-15' })).toEqual(['6 días sin actividad']);
  });

  it('sin actividad, mide la inactividad desde la validación', () => {
    expect(attentionReasons({ ...base, lastActivity: null, activeSince: '2026-10-17' })).toEqual(['4 días sin actividad']);
  });
});
