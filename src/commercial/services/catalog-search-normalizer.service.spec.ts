import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PresenceFilter, ResaleFilter } from '../enums/catalog-filter.enums';
import { CatalogSearchNormalizerService } from './catalog-search-normalizer.service';

describe('CatalogSearchNormalizerService', () => {
  const service = new CatalogSearchNormalizerService();

  it('normaliza uma pesquisa com os valores padrão', () => {
    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
    });

    expect(service.normalize(input)).toEqual({
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
    });
  });

  it('traduz filtros positivos para S', () => {
    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
      resale: ResaleFilter.YES,
      pricePresence: PresenceFilter.WITH,
      innerBoxPresence: PresenceFilter.WITH,
    });

    const result = service.normalize(input);

    expect(result.resale).toBe('S');
    expect(result.pricePresence).toBe('S');
    expect(result.innerBoxPresence).toBe('S');
  });

  it('traduz filtros negativos para N', () => {
    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
      resale: ResaleFilter.NO,
      pricePresence: PresenceFilter.WITHOUT,
      innerBoxPresence: PresenceFilter.WITHOUT,
    });

    const result = service.normalize(input);

    expect(result.resale).toBe('N');
    expect(result.pricePresence).toBe('N');
    expect(result.innerBoxPresence).toBe('N');
  });

  it('normaliza arrays opcionais vazios para null sem usar -1', () => {
    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468],
      departmentCodes: [],
      sectionCodes: [],
      parentClientCodes: [],
      clientCodes: [],
    });

    const result = service.normalize(input);

    expect(result.departmentCodes).toBeNull();
    expect(result.sectionCodes).toBeNull();
    expect(result.parentClientCodes).toBeNull();
    expect(result.clientCodes).toBeNull();

    expect(JSON.stringify(result)).not.toContain('-1');
  });

  it('preserva múltiplos códigos e parâmetros numéricos', () => {
    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [468, 469],
      departmentCodes: [100, 600],
      sectionCodes: [10, 20],
      parentClientCodes: [35826, 36491],
      clientCodes: [35827, 36492],
      discountPercent: 12.5,
      maxFinalPrice: 350.75,
      minStock: 3,
      purchaseMonths: 6,
    });

    expect(service.normalize(input)).toMatchObject({
      plazaCodes: [468, 469],
      departmentCodes: [100, 600],
      sectionCodes: [10, 20],
      parentClientCodes: [35826, 36491],
      clientCodes: [35827, 36492],
      discountPercent: 12.5,
      maxFinalPrice: 350.75,
      minStock: 3,
      purchaseMonths: 6,
    });
  });

  it('não reutiliza as referências dos arrays recebidos', () => {
    const plazaCodes = [468];
    const departmentCodes = [600];

    const input = Object.assign(new CatalogSearchDto(), {
      plazaCodes,
      departmentCodes,
    });

    const result = service.normalize(input);

    expect(result.plazaCodes).not.toBe(plazaCodes);
    expect(result.departmentCodes).not.toBe(departmentCodes);

    plazaCodes.push(999);
    departmentCodes.push(999);

    expect(result.plazaCodes).toEqual([468]);
    expect(result.departmentCodes).toEqual([600]);
  });
});
