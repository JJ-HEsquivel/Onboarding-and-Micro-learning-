import { describe, expect, it } from 'vitest';
import { anyOf, bind, odataId, odataString, unwrap } from './dataverse';

const ID = '4910a32c-dbac-f111-aaac-7ced8da8a93d';

describe('odataString (consultas seguras)', () => {
  it('duplica las comillas simples para que el texto no cierre el filtro', () => {
    expect(odataString("O'Brien")).toBe("'O''Brien'");
  });

  it('un intento de inyección queda como texto literal', () => {
    expect(odataString("x' or statecode eq 1 or 'a")).toBe("'x'' or statecode eq 1 or ''a'");
  });
});

describe('odataId (consultas seguras)', () => {
  it('acepta un GUID', () => {
    expect(odataId(ID)).toBe(ID);
  });

  it.each(['', 'abc', `${ID} or statecode eq 1`, `${ID})`])('rechaza %j', (value) => {
    expect(() => odataId(value)).toThrow('Identificador inválido');
  });

  it('anyOf valida cada id', () => {
    expect(anyOf('_jsi_question_value', [ID])).toBe(`(_jsi_question_value eq ${ID})`);
    expect(() => anyOf('_jsi_question_value', [ID, 'x or 1 eq 1'])).toThrow();
  });
});

describe('unwrap', () => {
  it('devuelve los datos de una operación exitosa', () => {
    expect(unwrap({ success: true, data: [1, 2] } as never, 'Leer')).toEqual([1, 2]);
  });

  it('lanza un error que dice qué se intentaba hacer', () => {
    expect(() => unwrap({ success: false, error: { message: 'sin permiso' } } as never, 'Leer roles')).toThrow('Leer roles: sin permiso');
  });
});

describe('bind', () => {
  it('arma la referencia de un lookup', () => {
    expect(bind('jsi_areas', ID)).toBe(`/jsi_areas(${ID})`);
  });
});
