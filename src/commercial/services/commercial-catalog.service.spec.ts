import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { CatalogSearchCriteria } from '../interfaces/catalog-search-criteria.interface';
import { CatalogQuery } from '../interfaces/catalog-query.interface';
import { CatalogQueryBuilder } from './catalog-query.builder';
import { CatalogSearchNormalizerService } from './catalog-search-normalizer.service';
import { CommercialCatalogService } from './commercial-catalog.service';

describe('CommercialCatalogService', () => {
  const createSubject = () => {
    const query = jest.fn();
    const normalize = jest.fn();
    const build = jest.fn();

    const oracleService = {
      query,
    } as unknown as OracleService;

    const normalizer = {
      normalize,
    } as unknown as CatalogSearchNormalizerService;

    const queryBuilder = {
      build,
    } as unknown as CatalogQueryBuilder;

    const service = new CommercialCatalogService(
      oracleService,
      normalizer,
      queryBuilder,
    );

    return {
      service,
      query,
      normalize,
      build,
    };
  };

  it('normaliza, monta e executa a consulta do catálogo', async () => {
    const { service, query, normalize, build } = createSubject();

    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
    });

    const criteria: CatalogSearchCriteria = {
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
    };

    const preparedQuery: CatalogQuery = {
      sql: 'SELECT CATALOGO FROM DUAL',
      binds: {
        plaza0: 468,
      },
    };

    normalize.mockReturnValue(criteria);
    build.mockReturnValue(preparedQuery);
    query.mockResolvedValue([]);

    await expect(service.search(input)).resolves.toEqual([]);

    expect(normalize).toHaveBeenCalledWith(input);
    expect(build).toHaveBeenCalledWith(criteria);

    expect(query).toHaveBeenCalledWith(preparedQuery.sql, preparedQuery.binds);
  });

  it('mapeia uma linha Oracle sem expor o caminho interno da foto', async () => {
    const { service, query, normalize, build } = createSubject();

    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
    });

    normalize.mockReturnValue({
      plazaCodes: [468],
      departmentCodes: null,
      sectionCodes: null,
      parentClientCodes: null,
      clientCodes: null,
      resale: null,
      discountPercent: 10,
      maxFinalPrice: 500,
      pricePresence: 'T',
      innerBoxPresence: 'T',
      minStock: 0,
      purchaseMonths: 9999,
    });

    build.mockReturnValue({
      sql: 'SELECT CATALOGO FROM DUAL',
      binds: {
        plaza0: 468,
        discountPercent: 10,
        maxFinalPrice: 500,
        minStock: 0,
      },
    });

    query.mockResolvedValue([
      {
        PHOTO_PATH: '\\\\servidor\\WINTHOR\\IMG\\produto.jpg',
        PRODUCT_CODE: 123,
        DESCRIPTION: 'PRODUTO TESTE',

        MULTIPLE_QUANTITY: 1,
        INNER_BOX_QUANTITY: 6,
        MASTER_BOX_QUANTITY: 24,

        IPI_PERCENT: 5,
        IPI_VALUE: 2.5,
        MVA_PERCENT: 40,
        ST_VALUE: 3.5,

        PRICE_REGION_CODE: 368,
        PRICE_STATE: 'SP',
        PRICE_REGION_NAME: 'SAO PAULO',
        PRICE_REGION_TYPE: 'UF',

        NET_PRICE: 100,
        GROSS_PRICE: 106,
        DISCOUNT_PERCENT: 10,
        DISCOUNTED_NET_PRICE: 90,
        DISCOUNTED_GROSS_PRICE: 95.4,

        PROMOTION_START: new Date('2026-09-01T00:00:00.000Z'),
        PROMOTION_END: new Date('2026-09-30T00:00:00.000Z'),
        PROMOTION_PERCENT: 20,
        PROMOTION_MIN_QUANTITY: 3,
        PROMOTION_NET_PRICE: 80,
        PROMOTION_GROSS_PRICE: 84.8,

        ALERT: null,
        AVAILABLE_STOCK: 15,

        BRAND: 'MARCA TESTE',
        LINE_STATUS: 'EM LINHA',

        DEPARTMENT_CODE: 600,
        DEPARTMENT_NAME: 'BRINQUEDOS',
        SECTION_NAME: 'SECAO TESTE',
        SALES_CURVE: 'A',

        RESALE: 'S',
      },
    ]);

    const result = await service.search(input);

    expect(result).toEqual([
      {
        productCode: 123,
        description: 'PRODUTO TESTE',
        photoAvailable: true,

        multipleQuantity: 1,
        innerBoxQuantity: 6,
        masterBoxQuantity: 24,

        ipiPercent: 5,
        ipiValue: 2.5,
        mvaPercent: 40,
        stValue: 3.5,

        priceRegionCode: 368,
        priceState: 'SP',
        priceRegionName: 'SAO PAULO',
        priceRegionType: 'UF',

        netPrice: 100,
        grossPrice: 106,
        discountPercent: 10,
        discountedNetPrice: 90,
        discountedGrossPrice: 95.4,

        promotionStart: '2026-09-01T00:00:00.000Z',
        promotionEnd: '2026-09-30T00:00:00.000Z',
        promotionPercent: 20,
        promotionMinQuantity: 3,
        promotionNetPrice: 80,
        promotionGrossPrice: 84.8,

        alert: '',
        availableStock: 15,

        brand: 'MARCA TESTE',
        lineStatus: 'EM LINHA',

        departmentCode: 600,
        departmentName: 'BRINQUEDOS',
        sectionName: 'SECAO TESTE',
        salesCurve: 'A',

        resale: 'S',
      },
    ]);

    expect(result[0]).not.toHaveProperty('photoPath');

    expect(JSON.stringify(result)).not.toContain('WINTHOR\\\\IMG');
  });

  it('preserva preços ausentes como null', async () => {
    const { service, query, normalize, build } = createSubject();

    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
    });

    normalize.mockReturnValue({
      plazaCodes: [468],
      departmentCodes: null,
      sectionCodes: null,
      parentClientCodes: null,
      clientCodes: null,
      resale: null,
      discountPercent: 0,
      maxFinalPrice: 99999,
      pricePresence: 'N',
      innerBoxPresence: 'T',
      minStock: 0,
      purchaseMonths: 9999,
    });

    build.mockReturnValue({
      sql: 'SELECT CATALOGO FROM DUAL',
      binds: {},
    });

    query.mockResolvedValue([
      {
        PHOTO_PATH: null,
        PRODUCT_CODE: 456,
        DESCRIPTION: 'SEM PRECO',

        MULTIPLE_QUANTITY: 1,
        INNER_BOX_QUANTITY: null,
        MASTER_BOX_QUANTITY: null,

        IPI_PERCENT: 0,
        IPI_VALUE: 0,
        MVA_PERCENT: 0,
        ST_VALUE: 0,

        PRICE_REGION_CODE: 368,
        PRICE_STATE: 'SP',
        PRICE_REGION_NAME: 'SAO PAULO',
        PRICE_REGION_TYPE: 'UF',

        NET_PRICE: null,
        GROSS_PRICE: null,
        DISCOUNT_PERCENT: 0,
        DISCOUNTED_NET_PRICE: null,
        DISCOUNTED_GROSS_PRICE: null,

        PROMOTION_START: null,
        PROMOTION_END: null,
        PROMOTION_PERCENT: 0,
        PROMOTION_MIN_QUANTITY: null,
        PROMOTION_NET_PRICE: null,
        PROMOTION_GROSS_PRICE: null,

        ALERT: 'SEM PRECO',
        AVAILABLE_STOCK: 0,

        BRAND: null,
        LINE_STATUS: 'EM LINHA',

        DEPARTMENT_CODE: null,
        DEPARTMENT_NAME: null,
        SECTION_NAME: null,
        SALES_CURVE: null,

        RESALE: 'N',
      },
    ]);

    const [result] = await service.search(input);

    expect(result.photoAvailable).toBe(false);

    expect(result.netPrice).toBeNull();
    expect(result.grossPrice).toBeNull();
    expect(result.discountedNetPrice).toBeNull();
    expect(result.discountedGrossPrice).toBeNull();

    expect(result.alert).toBe('SEM PRECO');
  });
});
