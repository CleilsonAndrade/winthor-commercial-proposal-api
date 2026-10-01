import { BadRequestException } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { CatalogItem } from '../interfaces/catalog-item.interface';
import { CommercialCatalogService } from './commercial-catalog.service';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';

describe('CommercialPreQuoteService', () => {
  const createCatalogItem = (
    productCode: number,
    netPrice: number | null,
    promotion?: {
      percent: number;
      minimumQuantity: number;
      netPrice: number;
      grossPrice: number;
    },
  ): CatalogItem =>
    ({
      productCode,
      description: `PRODUTO ${productCode}`,

      netPrice,
      grossPrice: netPrice,

      discountPercent: 10,
      discountedNetPrice:
        netPrice === null ? null : Number((netPrice * 0.9).toFixed(2)),
      discountedGrossPrice:
        netPrice === null ? null : Number((netPrice * 0.9).toFixed(2)),

      promotionPercent: promotion?.percent ?? 0,
      promotionMinQuantity: promotion?.minimumQuantity ?? null,
      promotionNetPrice: promotion?.netPrice ?? netPrice,
      promotionGrossPrice: promotion?.grossPrice ?? netPrice,

      priceRegionCode: 368,
      priceRegionName: 'SAO PAULO',
      priceRegionType: 'UF',
      priceState: 'SP',
    }) as CatalogItem;

  const createSubject = () => {
    const search = jest.fn();

    const commercialCatalogService = {
      search,
    } as unknown as CommercialCatalogService;

    const service = new CommercialPreQuoteService(commercialCatalogService);

    return {
      service,
      search,
    };
  };

  it('resolve os produtos novamente pelo catálogo', async () => {
    const { service, search } = createSubject();

    const product7624 = createCatalogItem(7624, 91.85);
    const product7625 = createCatalogItem(7625, 91.85);

    search.mockResolvedValue([product7624, product7625]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      discountPercent: 10,
      items: [
        {
          productCode: 7625,
          quantity: 6,
        },
        {
          productCode: 7624,
          quantity: 12,
        },
      ],
    });

    const result = await service.calculate(input);

    expect(search).toHaveBeenCalledTimes(1);

    const [catalogInput] = search.mock.calls[0] as [CatalogSearchDto];

    expect(catalogInput).toMatchObject({
      plazaCodes: [468],
      discountPercent: 10,
    });

    expect(result).toMatchObject({
      context: {
        plazaCodes: [468],
        discountPercent: 10,
      },
      items: [
        {
          quantity: 6,
          product: product7625,
        },
        {
          quantity: 12,
          product: product7624,
        },
      ],
    });
  });

  it('não confunde produto sem preço com produto inexistente', async () => {
    const { service, search } = createSubject();

    const product = createCatalogItem(7624, null);

    search.mockResolvedValue([product]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 1,
        },
      ],
    });

    const result = await service.calculate(input);

    expect(result.items[0].product.productCode).toBe(7624);
    expect(result.items[0].product.netPrice).toBeNull();
  });

  it('rejeita produto que não pertence ao catálogo resolvido', async () => {
    const { service, search } = createSubject();

    search.mockResolvedValue([createCatalogItem(7624, 91.85)]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 12,
        },
        {
          productCode: 999999,
          quantity: 1,
        },
      ],
    });

    await expect(service.calculate(input)).rejects.toMatchObject({
      response: {
        message:
          'Produtos não encontrados no catálogo para o contexto informado',
        productCodes: [999999],
      },
    });

    await expect(service.calculate(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('não trata preço promocional preenchido como campanha quando percentual é zero', async () => {
    const { service, search } = createSubject();

    const product = createCatalogItem(7624, 91.85);

    search.mockResolvedValue([product]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      discountPercent: 10,
      items: [
        {
          productCode: 7624,
          quantity: 12,
        },
      ],
    });

    const result = await service.calculate(input);

    expect(result.items[0].pricing).toEqual({
      regular: {
        netUnitPrice: 91.85,
        grossUnitPrice: 91.85,
      },
      discount: {
        percent: 10,
        netUnitPrice: 82.66,
        grossUnitPrice: 82.66,
      },
      promotion: {
        available: false,
        eligible: false,
        minimumQuantity: null,
        percent: 0,
        netUnitPrice: null,
        grossUnitPrice: null,
      },
    });
  });

  it('informa promoção disponível mas inelegível abaixo da quantidade mínima', async () => {
    const { service, search } = createSubject();

    const product = createCatalogItem(7624, 100, {
      percent: 20,
      minimumQuantity: 6,
      netPrice: 80,
      grossPrice: 84.8,
    });

    search.mockResolvedValue([product]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 5,
        },
      ],
    });

    const result = await service.calculate(input);

    expect(result.items[0].pricing.promotion).toEqual({
      available: true,
      eligible: false,
      minimumQuantity: 6,
      percent: 20,
      netUnitPrice: 80,
      grossUnitPrice: 84.8,
    });
  });

  it('torna promoção elegível ao atingir a quantidade mínima', async () => {
    const { service, search } = createSubject();

    const product = createCatalogItem(7624, 100, {
      percent: 20,
      minimumQuantity: 6,
      netPrice: 80,
      grossPrice: 84.8,
    });

    search.mockResolvedValue([product]);

    const input = Object.assign(new PreQuoteCalculateDto(), {
      plazaCodes: [468],
      items: [
        {
          productCode: 7624,
          quantity: 6,
        },
      ],
    });

    const result = await service.calculate(input);

    expect(result.items[0].pricing.promotion).toEqual({
      available: true,
      eligible: true,
      minimumQuantity: 6,
      percent: 20,
      netUnitPrice: 80,
      grossUnitPrice: 84.8,
    });
  });
});
