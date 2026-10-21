import { describe, expect, it } from 'vitest';
import { computeProgress, documentStep, isExamExhausted, type RouteItemState } from './onboardingProgress';

const TODAY = '2026-10-21';
const MAX_ATTEMPTS = 3;

const item = (overrides: Partial<RouteItemState> = {}): RouteItemState => ({
  isRead: false,
  dueDate: '2026-10-30',
  exam: { status: 'locked', score: null, attemptsUsed: 0, dueDate: null },
  ...overrides,
});

describe('documentStep', () => {
  it('pide leer mientras la lectura no está confirmada', () => {
    expect(documentStep(item(), MAX_ATTEMPTS)).toBe('read');
  });

  it('pide rendir el examen después de leer', () => {
    const read = item({ isRead: true, exam: { status: 'pending', score: null, attemptsUsed: 0, dueDate: null } });
    expect(documentStep(read, MAX_ATTEMPTS)).toBe('exam');
  });

  it('aprueba el documento solo con el examen aprobado', () => {
    const passed = item({ isRead: true, exam: { status: 'passed', score: 90, attemptsUsed: 1, dueDate: null } });
    expect(documentStep(passed, MAX_ATTEMPTS)).toBe('approved');
  });

  it('aprueba al leer si el documento no tiene examen', () => {
    expect(documentStep(item({ isRead: true, exam: null }), MAX_ATTEMPTS)).toBe('approved');
  });

  it('marca intentos agotados al reprobar el último intento', () => {
    const exhausted = item({ isRead: true, exam: { status: 'failed', score: 40, attemptsUsed: 3, dueDate: null } });
    expect(documentStep(exhausted, MAX_ATTEMPTS)).toBe('exhausted');
    expect(isExamExhausted(exhausted.exam!, MAX_ATTEMPTS)).toBe(true);
  });
});

describe('computeProgress', () => {
  it('sin actividad, la inducción no empezó y el riesgo es bajo', () => {
    const progress = computeProgress([item(), item()], TODAY, MAX_ATTEMPTS);
    expect(progress).toMatchObject({ total: 2, read: 0, approved: 0, status: 'notStarted', risk: 'low' });
  });

  it('se completa cuando todos los documentos están aprobados', () => {
    const done = item({ isRead: true, exam: { status: 'passed', score: 100, attemptsUsed: 1, dueDate: null } });
    const progress = computeProgress([done, done], TODAY, MAX_ATTEMPTS);
    expect(progress).toMatchObject({ approved: 2, status: 'completed', risk: 'low', averageScore: 100 });
  });

  it('una lectura vencida la deja atrasada y con riesgo alto', () => {
    const progress = computeProgress([item({ dueDate: '2026-10-01' })], TODAY, MAX_ATTEMPTS);
    expect(progress).toMatchObject({ status: 'overdue', risk: 'high' });
  });

  it('un examen reprobado con intentos disponibles da riesgo medio', () => {
    const failed = item({ isRead: true, exam: { status: 'failed', score: 60, attemptsUsed: 1, dueDate: '2026-10-30' } });
    expect(computeProgress([failed], TODAY, MAX_ATTEMPTS)).toMatchObject({ status: 'inProgress', risk: 'medium' });
  });

  it('promedia solo los exámenes rendidos', () => {
    const a = item({ isRead: true, exam: { status: 'passed', score: 80, attemptsUsed: 1, dueDate: null } });
    const b = item({ isRead: true, exam: { status: 'passed', score: 91, attemptsUsed: 1, dueDate: null } });
    expect(computeProgress([a, b, item()], TODAY, MAX_ATTEMPTS).averageScore).toBe(86);
  });
});
