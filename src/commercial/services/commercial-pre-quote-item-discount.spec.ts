import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { CatalogItem } from '../interfaces/catalog-item.interface';
import { CommercialCatalogService } from './commercial-catalog.service';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';

function createProduct(
  productCode: number,
  overrides: Partial<CatalogItem> = {},
): CatalogItem {
  return {
    productCode,
    netPrice: 100,
    grossPrice: 120,
    discountPercent: 10,
    discountedNetPrice: 90,
    discountedGrossPrice: 108,
    promotionPercent: 0,
    promotionMinQuantity: null,
    promotionNetPrice: null,
    promotionGrossPrice: null,
    ...overrides,
  } as CatalogItem;
}

function createSubject(products: CatalogItem[]) {
  const searchByProductCodes = jest.fn().mockResolvedValue(products);

  const catalogService = {
    searchByProductCodes,
  } as unknown as CommercialCatalogService;

  const service = new CommercialPreQuoteService(catalogService);

  return { service, searchByProductCodes };
}

function createInput(
  items: Array<{
    productCode: number;
    quantity: number;
    discountPercent?: number;
  }>,
): PreQuoteCalculateDto {
  return Object.assign(new PreQuoteCalculateDto(), {
    plazaCodes: [468],
    discountPercent: 10,
    items,
  });
}

describe('CommercialPreQuoteService - desconto individual', () => {
  it('soma o desconto geral ao desconto do produto', async () => {
    const { service } = createSubject([createProduct(6650)]);

    const result = await service.calculate(
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: 15,
        },
      ]),
    );

    expect(result.context.discountPercent).toBe(10);

    expect(result.items[0].pricing.discount).toEqual({
      percent: 25,
      netUnitPrice: 75,
      grossUnitPrice: 90,
    });

    expect(result.items[0].totals.discount).toEqual({
      net: 150,
      gross: 180,
    });
  });

  it('herda o desconto geral quando o individual não é enviado', async () => {
    const { service } = createSubject([createProduct(6650)]);

    const result = await service.calculate(
      createInput([{ productCode: 6650, quantity: 2 }]),
    );

    expect(result.items[0].pricing.discount).toEqual({
      percent: 10,
      netUnitPrice: 90,
      grossUnitPrice: 108,
    });

    expect(result.items[0].totals.discount).toEqual({
      net: 180,
      gross: 216,
    });
  });

  it('soma 0% individual preservando o desconto geral', async () => {
    const { service } = createSubject([createProduct(6650)]);

    const result = await service.calculate(
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: 0,
        },
      ]),
    );

    expect(result.items[0].pricing.discount).toEqual({
      percent: 10,
      netUnitPrice: 90,
      grossUnitPrice: 108,
    });
  });

  it('aceita desconto individual que completa 100%', async () => {
    const { service } = createSubject([createProduct(6650)]);

    const result = await service.calculate(
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: 90,
        },
      ]),
    );

    expect(result.items[0].totals.discount).toEqual({
      net: 0,
      gross: 0,
    });
  });

  it('consolida produtos com descontos diferentes', async () => {
    const { service } = createSubject([
      createProduct(6650),
      createProduct(7654, {
        netPrice: 50,
        grossPrice: 60,
        discountedNetPrice: 45,
        discountedGrossPrice: 54,
      }),
    ]);

    const result = await service.calculate(
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: 15,
        },
        {
          productCode: 7654,
          quantity: 1,
        },
      ]),
    );

    expect(result.items[0].pricing.discount.percent).toBe(25);
    expect(result.items[1].pricing.discount.percent).toBe(10);

    expect(result.summary.discount).toEqual({
      net: 195,
      gross: 234,
    });

    expect(result.summary.totalQuantity).toBe(3);
  });

  it('mantém a promoção separada do desconto individual', async () => {
    const product = createProduct(6650, {
      promotionPercent: 20,
      promotionMinQuantity: 3,
      promotionNetPrice: 80,
      promotionGrossPrice: 96,
    });

    const { service } = createSubject([product]);

    const result = await service.calculate(
      createInput([
        {
          productCode: 6650,
          quantity: 3,
          discountPercent: 15,
        },
      ]),
    );

    expect(result.items[0].totals.discount.net).toBe(225);

    expect(result.items[0].pricing.promotion).toMatchObject({
      available: true,
      eligible: true,
      percent: 20,
    });

    expect(result.items[0].totals.promotion).toEqual({
      eligible: true,
      net: 240,
      gross: 288,
    });
  });
  it('soma percentuais fracionários corretamente', async () => {
    const { service } = createSubject([
      createProduct(8736, {
        discountPercent: 0.06,
        discountedNetPrice: 99.94,
        discountedGrossPrice: 119.93,
      }),
    ]);

    const result = await service.calculate(
      createInput([{ productCode: 8736, quantity: 1, discountPercent: 0.08 }]),
    );

    expect(result.items[0].pricing.discount.percent).toBe(0.14);
    expect(result.items[0].pricing.discount.netUnitPrice).toBe(99.86);
  });

  it('rejeita desconto geral mais individual acima de 100%', async () => {
    const { service } = createSubject([createProduct(6650)]);

    await expect(
      service.calculate(
        createInput([{ productCode: 6650, quantity: 1, discountPercent: 91 }]),
      ),
    ).rejects.toThrow('ultrapassa 100%');
  });
});

describe('PreQuoteCalculateDto - desconto individual', () => {
  it('rejeita desconto individual acima de 100%', async () => {
    const input = plainToInstance(
      PreQuoteCalculateDto,
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: 101,
        },
      ]),
    );

    const errors = await validate(input);

    expect(JSON.stringify(errors)).toContain('discountPercent');
  });

  it('rejeita desconto individual negativo', async () => {
    const input = plainToInstance(
      PreQuoteCalculateDto,
      createInput([
        {
          productCode: 6650,
          quantity: 2,
          discountPercent: -1,
        },
      ]),
    );

    const errors = await validate(input);

    expect(JSON.stringify(errors)).toContain('discountPercent');
  });

  it('aceita desconto ausente, 0% e 100%', async () => {
    const input = plainToInstance(
      PreQuoteCalculateDto,
      createInput([
        { productCode: 6650, quantity: 2 },
        {
          productCode: 7654,
          quantity: 1,
          discountPercent: 0,
        },
        {
          productCode: 7655,
          quantity: 1,
          discountPercent: 100,
        },
      ]),
    );

    expect(await validate(input)).toEqual([]);
  });
});
