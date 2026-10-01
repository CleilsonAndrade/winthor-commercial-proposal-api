import { OracleService } from '../../infrastructure/oracle/oracle.service';
import {
  COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL,
  COMMERCIAL_UF_REGION_CODES_SQL,
} from '../constants/commercial-region.constants';
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
    expect(sql).toContain(
      `WHEN R.NUMREGIAO IN (${COMMERCIAL_UF_REGION_CODES_SQL})`,
    );
    expect(sql).toContain(
      `AND R.NUMREGIAO IN (${COMMERCIAL_HOMOLOGATED_REGION_CODES_SQL})`,
    );
    expect(sql.split(COMMERCIAL_UF_REGION_CODES_SQL)).toHaveLength(3);
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

  it('consulta somente seções não excluídas com seu departamento', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([
      {
        CODE: 123,
        NAME: 'BONECAS',
        DEPARTMENT_CODE: 600,
        DEPARTMENT_NAME: 'BRINQUEDOS',
      },
      {
        CODE: 456,
        NAME: 'SEM DEPARTAMENTO',
        DEPARTMENT_CODE: null,
        DEPARTMENT_NAME: null,
      },
    ]);

    await expect(service.findSections('bone')).resolves.toEqual([
      {
        code: 123,
        name: 'BONECAS',
        departmentCode: 600,
        departmentName: 'BRINQUEDOS',
      },
      {
        code: 456,
        name: 'SEM DEPARTAMENTO',
        departmentCode: null,
        departmentName: null,
      },
    ]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('FROM PCSECAO SEC');
    expect(sql).toContain('LEFT JOIN PCDEPTO DEP');
    expect(sql).toContain('SEC.DTEXCLUSAO IS NULL');
    expect(sql).toContain(
      "UPPER(SEC.DESCRICAO) LIKE '%' || UPPER(:search) || '%'",
    );

    expect(binds).toEqual({
      search: 'bone',
    });
  });

  it('normaliza pesquisa de seção em branco para null', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(service.findSections('   ')).resolves.toEqual([]);

    const [, binds] = query.mock.calls[0] as [string, Record<string, unknown>];

    expect(binds).toEqual({
      search: null,
    });
  });

  it('consulta somente clientes principais com lojas vinculadas', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([
      {
        CODE: 100,
        NAME: 'REDE TESTE',
        TRADE_NAME: 'REDE TESTE LTDA',
        DOCUMENT: '12345678000199',
        STORE_COUNT: 4,
      },
    ]);

    await expect(service.findParentClients('rede')).resolves.toEqual([
      {
        code: 100,
        name: 'REDE TESTE',
        tradeName: 'REDE TESTE LTDA',
        document: '12345678000199',
        storeCount: 4,
      },
    ]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('WITH NETWORK AS');
    expect(sql).toContain('FROM PCCLIENT F');
    expect(sql).toContain('F.DTEXCLUSAO IS NULL');
    expect(sql).toContain('GROUP BY NVL(F.CODCLIPRINC, F.CODCLI)');
    expect(sql).toContain('FROM PCCLIENT CL');
    expect(sql).toContain('N.PARENT_CODE = CL.CODCLI');
    expect(sql).toContain('N.CHILD_COUNT > 0');
    expect(sql).toContain('CL.DTEXCLUSAO IS NULL');
    expect(sql).toContain("LIKE '%' || UPPER(:search) || '%'");
    expect(sql).toContain('CL.CLIENTE,');
    expect(sql).toContain('CL.CODCLI');

    expect(binds).toEqual({
      search: 'rede',
    });
  });

  it('normaliza pesquisa de cliente principal em branco para null', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(service.findParentClients('   ')).resolves.toEqual([]);

    const [, binds] = query.mock.calls[0] as [string, Record<string, unknown>];

    expect(binds).toEqual({
      search: null,
    });
  });

  it('consulta clientes por nome e prefixo de documento', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([
      {
        CODE: 12345,
        NAME: 'CLIENTE TESTE LTDA',
        TRADE_NAME: 'CLIENTE TESTE',
        DOCUMENT: '12345678000199',
        CITY: 'SAO PAULO',
        BLOCKED: 'N',
        NETWORK_CODE: 100,
      },
    ]);

    await expect(service.findClients('cliente', '12345678')).resolves.toEqual([
      {
        code: 12345,
        name: 'CLIENTE TESTE LTDA',
        tradeName: 'CLIENTE TESTE',
        document: '12345678000199',
        city: 'SAO PAULO',
        blocked: 'N',
        networkCode: 100,
      },
    ]);

    const [sql, binds] = query.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];

    expect(sql).toContain('FROM PCCLIENT C');
    expect(sql).toContain('C.DTEXCLUSAO IS NULL');
    expect(sql).toContain("LIKE '%' || UPPER(:search) || '%'");
    expect(sql).toContain("LIKE :documentPrefix || '%'");
    expect(sql).toContain('NVL(C.CODCLIPRINC, C.CODCLI) AS NETWORK_CODE');

    expect(binds).toEqual({
      search: 'cliente',
      documentPrefix: '12345678',
    });
  });

  it('permite pesquisar cliente somente por documento', async () => {
    const { service, query } = createSubject();

    query.mockResolvedValue([]);

    await expect(service.findClients(undefined, '12345678')).resolves.toEqual(
      [],
    );

    const [, binds] = query.mock.calls[0] as [string, Record<string, unknown>];

    expect(binds).toEqual({
      search: null,
      documentPrefix: '12345678',
    });
  });

  it('rejeita pesquisa de cliente sem nenhum critério', async () => {
    const { service, query } = createSubject();

    await expect(service.findClients('   ', '   ')).rejects.toThrow(
      'Informe o nome ou o prefixo do documento para pesquisar clientes.',
    );

    expect(query).not.toHaveBeenCalled();
  });
});
