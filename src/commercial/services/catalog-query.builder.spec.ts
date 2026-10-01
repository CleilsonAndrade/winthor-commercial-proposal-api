import { COMMERCIAL_UF_REGION_CODES_SQL } from '../constants/commercial-region.constants';
import { CatalogSearchCriteria } from '../interfaces/catalog-search-criteria.interface';
import { CatalogQueryFilterBuilder } from './catalog-query-filter.builder';
import { CatalogQueryBuilder } from './catalog-query.builder';

describe('CatalogQueryBuilder', () => {
  const filterBuilder = new CatalogQueryFilterBuilder();
  const builder = new CatalogQueryBuilder(filterBuilder);

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

  it('preserva a estrutura central do motor v5', () => {
    const { sql } = builder.build(createCriteria());

    expect(sql).toContain('FROM PCPRODUT P');
    expect(sql).toContain('FROM PCTABPR TP');

    expect(sql).toContain('ROW_NUMBER() OVER (');

    expect(sql).toContain('PARTITION BY TP.CODPROD');

    expect(sql).toContain('ORDER BY TP.PVENDASEMIMPOSTO1');

    expect(sql).toContain('WHERE X.RN = 1');

    expect(sql).toContain("WHERE CODFILIAL = '4'");

    expect(sql).toContain('FROM PCDESCONTO D');

    expect(sql).toContain('WHERE P.DTEXCLUSAO IS NULL');

    expect(sql).toContain('DEP.DESCRICAO,');

    expect(sql).toContain('SEC.DESCRICAO,');

    expect(sql).toContain('P.DESCRICAO');
  });

  it('insere a praça somente no escopo da região de preço', () => {
    const { sql, binds } = builder.build(
      createCriteria({
        plazaCodes: [468, 469],
      }),
    );

    const predicate = 'PR.CODPRACA IN (:plaza0, :plaza1)';

    expect(sql).toContain(predicate);

    expect(sql.split(predicate)).toHaveLength(2);

    const priceRegionIndex = sql.indexOf(predicate);

    const productWhereIndex = sql.indexOf('WHERE P.DTEXCLUSAO IS NULL');

    expect(priceRegionIndex).toBeGreaterThan(-1);
    expect(productWhereIndex).toBeGreaterThan(-1);

    expect(priceRegionIndex).toBeLessThan(productWhereIndex);

    expect(binds).toMatchObject({
      plaza0: 468,
      plaza1: 469,
    });
  });

  it('preserva os cálculos principais do resultado comercial', () => {
    const { sql } = builder.build(
      createCriteria({
        discountPercent: 10,
        minStock: 1,
      }),
    );

    expect(sql).toContain('P.PERCIPIVENDA');

    expect(sql).not.toContain('P.PERCIPI ');

    expect(sql).toContain('ROUND(T.PVENDASEMIMPOSTO1, 2) AS NET_PRICE');

    expect(sql).toContain('AS GROSS_PRICE');

    expect(sql).toContain(':discountPercent AS DISCOUNT_PERCENT');

    expect(sql).toContain('AS DISCOUNTED_NET_PRICE');

    expect(sql).toContain('AS DISCOUNTED_GROSS_PRICE');

    expect(sql).toContain('AS PROMOTION_NET_PRICE');

    expect(sql).toContain('AS PROMOTION_GROSS_PRICE');

    expect(sql).toContain('AS AVAILABLE_STOCK');

    expect(sql).toContain("THEN 'SEM PRECO'");

    expect(sql).toContain("THEN 'PROMO EM CONFLITO'");
  });

  it('preserva a agregação de estoque e promoção', () => {
    const { sql } = builder.build(createCriteria());

    expect(sql).toContain('SUM(QTEST) AS QTEST');

    expect(sql).toContain('SUM(QTRESERV) AS QTRESERV');

    expect(sql).toContain('SUM(QTBLOQUEADA) AS QTBLOQ');

    expect(sql).toContain("WHERE CODFILIAL = '4'");

    expect(sql).toContain("D.APLICADESCONTO = 'S'");

    expect(sql).toContain('NVL(D.QTINI, 0) > 0');

    expect(sql).toContain('D.DTFIM - D.DTINICIO <= 365');

    expect(sql).toContain('COUNT(*) AS QTPOLITICAS');
  });

  it('integra filtros opcionais somente no WHERE externo', () => {
    const { sql, binds } = builder.build(
      createCriteria({
        departmentCodes: [600],
        sectionCodes: [10, 20],
        resale: 'S',
        pricePresence: 'S',
        innerBoxPresence: 'N',
        minStock: 1,
      }),
    );

    const productWhereIndex = sql.indexOf('WHERE P.DTEXCLUSAO IS NULL');

    const departmentIndex = sql.indexOf('SEC.CODEPTO IN (:department0)');

    const sectionIndex = sql.indexOf('P.CODSEC IN (:section0, :section1)');

    expect(departmentIndex).toBeGreaterThan(productWhereIndex);

    expect(sectionIndex).toBeGreaterThan(productWhereIndex);

    expect(sql).toContain("NVL(P.REVENDA, 'N') = :resale");

    expect(sql).toContain('ROUND(NVL(T.PVENDASEMIMPOSTO1, 0), 2) > 0');

    expect(sql).toContain('END = :innerBoxPresence');

    expect(binds).toMatchObject({
      department0: 600,
      section0: 10,
      section1: 20,
      resale: 'S',
      innerBoxPresence: 'N',
      minStock: 1,
    });
  });

  it('integra cliente e rede cumulativamente no motor', () => {
    const { sql, binds } = builder.build(
      createCriteria({
        parentClientCodes: [35826],
        clientCodes: [35827],
        purchaseMonths: 12,
      }),
    );

    expect(sql).toContain('IN (:parentClient0)');

    expect(sql).toContain('C.CODCLI IN (:client0)');

    expect(sql).toContain('-1 * :purchaseMonths');

    expect(binds).toMatchObject({
      parentClient0: 35826,
      client0: 35827,
      purchaseMonths: 12,
    });
  });

  it('restringe PCTABPR aos produtos solicitados internamente', () => {
    const { sql, binds } = builder.build(
      createCriteria({
        productCodes: [7624, 12345],
      }),
    );

    const predicate = 'TP.CODPROD IN (:product0, :product1)';

    expect(sql).toContain(predicate);

    expect(sql.split(predicate)).toHaveLength(2);

    const priceTableIndex = sql.indexOf('FROM PCTABPR TP');
    const productPredicateIndex = sql.indexOf(predicate);
    const regionPredicateIndex = sql.indexOf(
      'AND TP.NUMREGIAO IN',
      productPredicateIndex,
    );

    expect(priceTableIndex).toBeGreaterThan(-1);
    expect(productPredicateIndex).toBeGreaterThan(priceTableIndex);
    expect(regionPredicateIndex).toBeGreaterThan(productPredicateIndex);

    expect(binds).toMatchObject({
      product0: 7624,
      product1: 12345,
    });
  });

  it('não reintroduz sentinelas técnicos da Rotina 800', () => {
    const { sql, binds } = builder.build(createCriteria());

    expect(sql).not.toContain('-1 IN');

    expect(sql).not.toContain(':PRACA');

    expect(sql).not.toContain(':DEPARTAMENTO');

    expect(sql).not.toContain(':SECAO');

    expect(sql).not.toContain(':CODCLI');

    expect(sql).not.toContain(':CODCLIPRINC');

    expect(sql).not.toContain(':TEMPRECO');

    expect(sql).not.toContain(':TEMINNER');

    expect(binds).not.toHaveProperty('PRACA');
  });

  it('classifica região pelo código homologado, não pelo nome', () => {
    const { sql } = builder.build(createCriteria());

    expect(sql).toContain(
      `WHEN T.NUMREGIAO IN (${COMMERCIAL_UF_REGION_CODES_SQL})`,
    );

    expect(sql).not.toContain("UPPER(RG.REGIAO) LIKE '%CAPITAL%'");

    expect(sql).not.toContain("UPPER(TRIM(RG.REGIAO)) = 'DISTRITO FEDERAL'");
  });

  it('preserva exatamente as 36 regiões homologadas do motor v5', () => {
    const { sql } = builder.build(createCriteria());

    const match = sql.match(/AND R\.NUMREGIAO IN \(\s*([\d,\s]+)\s*\)/);

    if (!match) {
      throw new Error('Lista de regiões homologadas não encontrada no SQL');
    }

    const regions = match[1].split(',').map((value) => Number(value.trim()));

    expect(regions).toEqual([
      300, 302, 308, 310, 314, 321, 324, 327, 328, 330, 332, 334, 336, 338, 340,
      342, 344, 346, 348, 350, 352, 355, 357, 362, 367, 368, 370, 372, 376, 377,
      381, 382, 383, 480, 481, 1000,
    ]);

    expect(regions).toHaveLength(36);
  });

  it('mantém correspondência exata entre placeholders SQL e binds', () => {
    const { sql, binds } = builder.build(
      createCriteria({
        plazaCodes: [468, 469],
        departmentCodes: [100, 600],
        sectionCodes: [10, 20],
        parentClientCodes: [35826],
        clientCodes: [35827],
        resale: 'S',
        discountPercent: 10,
        maxFinalPrice: 500,
        pricePresence: 'S',
        innerBoxPresence: 'N',
        minStock: 1,
        purchaseMonths: 12,
      }),
    );

    const sqlBindNames = Array.from(
      sql.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g),
      (match) => match[1],
    );

    const uniqueSqlBindNames = [...new Set(sqlBindNames)].sort();

    const suppliedBindNames = Object.keys(binds).sort();

    expect(uniqueSqlBindNames).toEqual(suppliedBindNames);
  });

  it('mantém promoção independente do desconto comercial informado', () => {
    const { sql } = builder.build(
      createCriteria({
        discountPercent: 10,
      }),
    );

    const promotionStart = sql.indexOf('PROM.DTINICIO AS PROMOTION_START');

    const alertStart = sql.indexOf('END AS ALERT', promotionStart);

    expect(promotionStart).toBeGreaterThan(-1);
    expect(alertStart).toBeGreaterThan(promotionStart);

    const promotionBlock = sql.slice(promotionStart, alertStart);

    expect(promotionBlock).toContain('NVL(PROM.PERCDESC, 0) / 100');

    expect(promotionBlock).not.toContain(':discountPercent');
  });
});
