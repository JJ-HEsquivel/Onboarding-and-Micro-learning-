import { describe, expect, it } from 'vitest';
import { diffSets } from './collections';
import { getInitials, normalizeText, pluralize } from './format';

describe('getInitials', () => {
  it('usa la primera letra del primer y del último nombre', () => {
    expect(getInitials('Juan Jose Ezequiel')).toBe('JE');
  });

  it('tolera espacios de más y un solo nombre', () => {
    expect(getInitials('  marcelo  ')).toBe('M');
    expect(getInitials('')).toBe('?');
  });
});

describe('normalizeText', () => {
  it('quita tildes y mayúsculas para buscar', () => {
    expect(normalizeText('Sofía Suárez')).toBe('sofia suarez');
  });
});

describe('pluralize', () => {
  it('usa el singular solo para 1', () => {
    expect(pluralize(1, 'documento', 'documentos')).toBe('1 documento');
    expect(pluralize(0, 'documento', 'documentos')).toBe('0 documentos');
  });
});

describe('diffSets', () => {
  it('dice qué agregar y qué quitar', () => {
    expect(diffSets(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({ toAdd: ['c'], toRemove: ['a'] });
  });
});
