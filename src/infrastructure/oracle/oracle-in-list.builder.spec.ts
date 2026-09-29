import { buildOracleInList } from './oracle-in-list.builder';

describe('buildOracleInList', () => {
  it('gera placeholders e binds para múltiplos valores', () => {
    expect(buildOracleInList('department', [600, 100])).toEqual({
      placeholders: ':department0, :department1',
      binds: {
        department0: 600,
        department1: 100,
      },
    });
  });

  it('retorna null para lista ausente', () => {
    expect(buildOracleInList('department', null)).toBeNull();

    expect(buildOracleInList('department', undefined)).toBeNull();
  });

  it('retorna null para lista vazia', () => {
    expect(buildOracleInList('department', [])).toBeNull();
  });

  it('mantém listas diferentes com nomes de bind independentes', () => {
    const plazas = buildOracleInList('plaza', [468, 469]);

    const departments = buildOracleInList('department', [100, 600]);

    expect(plazas).toEqual({
      placeholders: ':plaza0, :plaza1',
      binds: {
        plaza0: 468,
        plaza1: 469,
      },
    });

    expect(departments).toEqual({
      placeholders: ':department0, :department1',
      binds: {
        department0: 100,
        department1: 600,
      },
    });

    expect({
      ...plazas?.binds,
      ...departments?.binds,
    }).toEqual({
      plaza0: 468,
      plaza1: 469,
      department0: 100,
      department1: 600,
    });
  });

  it('rejeita prefixo que possa alterar o texto SQL', () => {
    expect(() => buildOracleInList('department) OR 1=1 --', [600])).toThrow(
      'Prefixo de bind Oracle inválido',
    );
  });

  it('rejeita valores que não sejam inteiros seguros', () => {
    expect(() => buildOracleInList('department', [600, Number.NaN])).toThrow(
      'Valor inválido para bind Oracle department[1]',
    );

    expect(() => buildOracleInList('department', [600.5])).toThrow(
      'Valor inválido para bind Oracle department[0]',
    );
  });
});
