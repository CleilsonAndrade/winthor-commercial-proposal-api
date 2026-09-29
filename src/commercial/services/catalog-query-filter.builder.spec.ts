import { CatalogSearchCriteria } from '../interfaces/catalog-search-criteria.interface';
import { CatalogQueryFilterBuilder } from './catalog-query-filter.builder';

describe('CatalogQueryFilterBuilder', () => {
  const builder = new CatalogQueryFilterBuilder();

  const createCriteria = (
    overrides: Partial<CatalogSearchCriteria> = {},
  ): CatalogSearchCriteria => ({
    plazaCodes: [468],
    departmentCodes: null,
    sectionCodes: null,
    parentClientCodes: null,
    clientCodes: null,
    resale: null,
    discountPercent: 0,
    maxFinalPrice: 99999,
    pricePresence: 'T',
    innerBoxPresence: 'T',
    minStock: 0,
    purchaseMonths: 9999,
    ...overrides,
  });

  it('separa o filtro de praça dos filtros externos de produto', () => {
    const result = builder.build(createCriteria());

    expect(result.priceRegionPredicate).toBe('PR.CODPRACA IN (:plaza0)');

    expect(result.productPredicates.join('\n')).not.toContain('PR.CODPRACA');

    expect(result.binds).toMatchObject({
      plaza0: 468,
      discountPercent: 0,
      maxFinalPrice: 99999,
      minStock: 0,
    });

    expect(result.productPredicates.join('\n')).not.toContain('-1');

    expect(result.productPredicates.join('\n')).not.toContain('SEC.CODEPTO IN');

    expect(result.productPredicates.join('\n')).not.toContain('P.CODSEC IN');

    expect(result.binds).not.toHaveProperty('purchaseMonths');
  });

  it('gera binds independentes para filtros múltiplos', () => {
    const result = builder.build(
      createCriteria({
        plazaCodes: [468, 469],
        departmentCodes: [100, 600],
        sectionCodes: [10, 20],
      }),
    );

    const sql = result.productPredicates.join('\n');

    expect(result.priceRegionPredicate).toBe(
      'PR.CODPRACA IN (:plaza0, :plaza1)',
    );

    expect(sql).toContain('SEC.CODEPTO IN (:department0, :department1)');

    expect(sql).toContain('P.CODSEC IN (:section0, :section1)');

    expect(result.binds).toMatchObject({
      plaza0: 468,
      plaza1: 469,
      department0: 100,
      department1: 600,
      section0: 10,
      section1: 20,
    });
  });

  it('adiciona revenda somente quando houver recorte', () => {
    const all = builder.build(
      createCriteria({
        resale: null,
      }),
    );

    const yes = builder.build(
      createCriteria({
        resale: 'S',
      }),
    );

    expect(all.productPredicates.join('\n')).not.toContain('P.REVENDA');

    expect(yes.productPredicates.join('\n')).toContain(
      "NVL(P.REVENDA, 'N') = :resale",
    );

    expect(yes.binds.resale).toBe('S');
  });

  it('adiciona presença ou ausência de preço', () => {
    const withPrice = builder.build(
      createCriteria({
        pricePresence: 'S',
      }),
    );

    const withoutPrice = builder.build(
      createCriteria({
        pricePresence: 'N',
      }),
    );

    expect(withPrice.productPredicates.join('\n')).toContain(
      'ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) > 0',
    );

    expect(withoutPrice.productPredicates.join('\n')).toContain(
      'ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) = 0',
    );
  });

  it('adiciona filtro de cliente principal com janela de compras', () => {
    const result = builder.build(
      createCriteria({
        parentClientCodes: [35826, 36491],
        purchaseMonths: 12,
      }),
    );

    const sql = result.productPredicates.join('\n');

    expect(sql).toContain('IN (:parentClient0, :parentClient1)');

    expect(sql).toContain('NVL(CL.CODCLIPRINC, CL.CODCLI)');

    expect(sql).toContain('-1 * :purchaseMonths');

    expect(result.binds).toMatchObject({
      parentClient0: 35826,
      parentClient1: 36491,
      purchaseMonths: 12,
    });
  });

  it('adiciona filtro de cliente com janela de compras', () => {
    const result = builder.build(
      createCriteria({
        clientCodes: [35827, 36492],
        purchaseMonths: 6,
      }),
    );

    const sql = result.productPredicates.join('\n');

    expect(sql).toContain('C.CODCLI IN (:client0, :client1)');

    expect(sql).toContain('-1 * :purchaseMonths');

    expect(result.binds).toMatchObject({
      client0: 35827,
      client1: 36492,
      purchaseMonths: 6,
    });
  });

  it('mantém cliente e cliente principal como filtros cumulativos', () => {
    const result = builder.build(
      createCriteria({
        parentClientCodes: [35826],
        clientCodes: [35827],
        purchaseMonths: 3,
      }),
    );

    const sql = result.productPredicates.join('\n');

    expect(sql).toContain('IN (:parentClient0)');

    expect(sql).toContain('C.CODCLI IN (:client0)');

    expect(result.binds).toMatchObject({
      parentClient0: 35826,
      client0: 35827,
      purchaseMonths: 3,
    });
  });

  it('rejeita critérios internos sem praça', () => {
    expect(() =>
      builder.build(
        createCriteria({
          plazaCodes: [],
        }),
      ),
    ).toThrow('Ao menos uma praça é obrigatória para consultar o catálogo.');
  });
});
