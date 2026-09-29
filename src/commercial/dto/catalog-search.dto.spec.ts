import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CatalogSearchDto } from './catalog-search.dto';
import { PresenceFilter, ResaleFilter } from '../enums/catalog-filter.enums';

describe('CatalogSearchDto', () => {
  it('aplica os padrões sem expor sentinelas do WinThor', async () => {
    const dto = plainToInstance(CatalogSearchDto, {
      plazaCodes: [468],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto).toMatchObject({
      plazaCodes: [468],
      resale: ResaleFilter.ALL,
      discountPercent: 0,
      maxFinalPrice: 99999,
      pricePresence: PresenceFilter.ALL,
      innerBoxPresence: PresenceFilter.ALL,
      minStock: 0,
      purchaseMonths: 9999,
    });
  });

  it('exige ao menos uma praça', async () => {
    const dto = plainToInstance(CatalogSearchDto, {
      plazaCodes: [],
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'plazaCodes')).toBe(true);
  });

  it('aceita múltiplos filtros comerciais válidos', async () => {
    const dto = plainToInstance(CatalogSearchDto, {
      plazaCodes: [468],
      departmentCodes: [600],
      sectionCodes: [700101, 700102],
      parentClientCodes: [35826],
      clientCodes: [35827],
      resale: ResaleFilter.YES,
      discountPercent: 10,
      maxFinalPrice: 500,
      pricePresence: PresenceFilter.WITH,
      innerBoxPresence: PresenceFilter.WITHOUT,
      minStock: 1,
      purchaseMonths: 12,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejeita desconto fora de 0 a 100', async () => {
    const dto = plainToInstance(CatalogSearchDto, {
      plazaCodes: [468],
      discountPercent: 101,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'discountPercent')).toBe(
      true,
    );
  });

  it('rejeita valores técnicos do WinThor no contrato público', async () => {
    const dto = plainToInstance(CatalogSearchDto, {
      plazaCodes: [468],
      resale: 'S',
      pricePresence: 'T',
      innerBoxPresence: 'N',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'resale')).toBe(true);

    expect(errors.some((error) => error.property === 'pricePresence')).toBe(
      true,
    );

    expect(errors.some((error) => error.property === 'innerBoxPresence')).toBe(
      true,
    );
  });
});
