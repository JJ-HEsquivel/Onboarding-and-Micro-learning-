import { describe, expect, it, vi } from 'vitest';
import type { RouteDocument, RouteStage } from '@/shared/types/onboarding';

// Los servicios generados crean su cliente de Power Apps al cargarse. En las pruebas no hay
// Power Apps: se reemplaza por un cliente vacío (estas funciones no leen datos).
vi.mock('@microsoft/power-apps/data', () => ({ getClient: () => ({}) }));

const { buildAreaRoute, computeStageDueDates, filterRoute, proposedDocumentIds } = await import('./onboardingRoute.service');

const doc = (id: string, isDefault = true): RouteDocument => ({
  id,
  code: id.toUpperCase(),
  title: id,
  version: '1.0',
  readingMinutes: 5,
  isCritical: false,
  isDefault,
  assessmentId: null,
});

const catalog = {
  stages: [
    { id: 'e2', name: 'Etapa 2', order: 2, isGeneral: true, businessDays: 5 },
    { id: 'e1', name: 'Etapa 1', order: 1, isGeneral: true, businessDays: 5 },
    { id: 'e3-eng', name: 'Etapa 3 · Engineering', order: 3, isGeneral: false, businessDays: 5 },
    { id: 'e3-qa', name: 'Etapa 3 · QA', order: 3, isGeneral: false, businessDays: 5 },
  ],
  documents: [
    { stageId: 'e1', document: doc('pol-1') },
    { stageId: 'e2', document: doc('pol-2') },
    { stageId: 'e2', document: doc('pol-solo-qa') },
    { stageId: 'e3-eng', document: doc('eng-1') },
    { stageId: 'e3-eng', document: doc('eng-opcional', false) },
    { stageId: 'e3-qa', document: doc('qa-1') },
  ],
  stageAreas: new Map([
    ['e3-eng', new Set(['ENG'])],
    ['e3-qa', new Set(['QA'])],
  ]),
  documentAreas: new Map([['pol-solo-qa', new Set(['QA'])]]),
};

describe('buildAreaRoute', () => {
  const route = buildAreaRoute(catalog, 'ENG');

  it('incluye las etapas generales y la etapa propia del área, en orden', () => {
    expect(route.map((s) => s.id)).toEqual(['e1', 'e2', 'e3-eng']);
  });

  it('excluye los documentos dirigidos solo a otras áreas', () => {
    expect(route.flatMap((s) => s.documents.map((d) => d.id))).not.toContain('pol-solo-qa');
  });
});

describe('proposedDocumentIds y filterRoute', () => {
  const route = buildAreaRoute(catalog, 'ENG');
  const proposed = proposedDocumentIds(route);

  it('propone todo lo general y en la etapa del área solo lo marcado por defecto', () => {
    expect([...proposed].sort()).toEqual(['eng-1', 'pol-1', 'pol-2']);
  });

  it('filterRoute deja solo los documentos elegidos', () => {
    const filtered = filterRoute(route, new Set(['pol-1']));
    expect(filtered.map((s) => s.id)).toEqual(['e1']);
  });
});

describe('computeStageDueDates', () => {
  const stage = (id: string, order: number, businessDays: number | null): RouteStage => ({
    id,
    name: id,
    order,
    isGeneral: true,
    businessDays,
    documents: [],
  });

  it('acumula los plazos en orden de etapa (días hábiles)', () => {
    // Inicio lunes 19/10: 5 días hábiles → 26/10; 5 más → 02/11.
    const due = computeStageDueDates([stage('b', 2, 5), stage('a', 1, 5)], '2026-10-19');
    expect(due.get('a')).toBe('2026-10-26');
    expect(due.get('b')).toBe('2026-11-02');
  });

  it('una etapa sin plazo no vence', () => {
    expect(computeStageDueDates([stage('libre', 1, null)], '2026-10-19').get('libre')).toBeNull();
  });
});
