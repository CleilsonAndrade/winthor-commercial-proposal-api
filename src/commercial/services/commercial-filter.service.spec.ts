import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { CommercialFilterService } from './commercial-filter.service';

describe('CommercialFilterService', () => {
  const createSubject = () => {
    const query = jest.fn();

    const oracleService = {
      query,
    } as unknown as OracleService;

    return {
      service: new CommercialFilterService(oracleService),
      query,
    };
  };

  it('consulta somente praças válidas das regiões homologadas', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([
      {
        CODE: 10,
        NAME: 'SAO PAULO',
        REGION_CODE: 368,
        STATE: 'SP',
        TYPE: 'UF',
      },
    ]);

    await expect(service.findPlazas('sao')).resolves.toEqual([
      {
        code: 10,
        name: 'SAO PAULO',
        regionCode: 368,
        state: 'SP',
        type: 'UF',
      },
    ]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain("NVL(PR.SITUACAO, 'A') <> 'I'");
    expect(sql).toContain("UPPER(TRIM(PR.PRACA)) NOT LIKE 'INAT%'");
    expect(sql).toContain("R.STATUS = 'A'");
    expect(sql).toContain('R.NUMREGIAO IN');
    expect(sql).toContain('300,302,308,310,314,321,324,327');
    expect(sql).not.toContain("UPPER(R.REGIAO) LIKE '%CAPITAL%'");
    expect(sql).toContain("UPPER(PR.PRACA) LIKE '%' || UPPER(:search) || '%'");

    expect(binds).toEqual({
      search: 'sao',
    });
  });

  it('normaliza pesquisa em branco para null', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(service.findPlazas('   ')).resolves.toEqual([]);

    const [, binds] = query.mock.calls[0] as [string, Record<string, unknown>];

    expect(binds).toEqual({
      search: null,
    });
  });

  it('consulta departamentos com situação e quantidade de seções', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([
      {
        CODE: 600,
        NAME: 'BRINQUEDOS',
        STATUS: 'ATIVO',
        SECTION_COUNT: 89,
      },
      {
        CODE: 300,
        NAME: 'INATIVO- PRODUTOS FL',
        STATUS: 'INATIVO',
        SECTION_COUNT: 1,
      },
    ]);

    await expect(service.findDepartments('brin')).resolves.toEqual([
      {
        code: 600,
        name: 'BRINQUEDOS',
        status: 'ATIVO',
        sectionCount: 89,
      },
      {
        code: 300,
        name: 'INATIVO- PRODUTOS FL',
        status: 'INATIVO',
        sectionCount: 1,
      },
    ]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('FROM PCDEPTO D');
    expect(sql).toContain('FROM PCSECAO S');
    expect(sql).toContain('S.DTEXCLUSAO IS NULL');
    expect(sql).toContain("UPPER(TRIM(D.DESCRICAO)) LIKE 'INAT%'");
    expect(sql).not.toContain("D.STATUS = 'A'");
    expect(sql).toContain(
      "UPPER(D.DESCRICAO) LIKE '%' || UPPER(:search) || '%'",
    );

    expect(binds).toEqual({
      search: 'brin',
    });
  });

  it('normaliza pesquisa de departamento em branco para null', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(service.findDepartments('   ')).resolves.toEqual([]);

    const [, binds] = query.mock.calls[0] as [string, Record<string, unknown>];

    expect(binds).toEqual({
      search: null,
    });
  });
});
