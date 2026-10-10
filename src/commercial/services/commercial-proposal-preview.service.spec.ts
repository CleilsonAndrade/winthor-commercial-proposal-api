import 'reflect-metadata';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { PreQuotePreview } from '../interfaces/pre-quote-preview.interface';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';
import { CommercialFilterService } from './commercial-filter.service';
import { CommercialProposalPreviewService } from './commercial-proposal-preview.service';

describe('CommercialProposalPreviewService', () => {
  it('organiza o pré-orçamento para apresentação sem recalcular preços', async () => {
    const calculate = jest.fn();

    const preQuoteService = {
      calculate,
    } as unknown as CommercialPreQuoteService;

    const filterService = {
      findClientByCode: jest.fn(),
    } as unknown as CommercialFilterService;

    const service = new CommercialProposalPreviewService(
      preQuoteService,
      filterService,
    );

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

    const preQuote: PreQuotePreview = {
      context: {
        plazaCodes: [468],
        discountPercent: 10,
      },

      items: [
        {
          quantity: 12,

          product: {
            productCode: 7624,
            description: 'ANDADOR INFANTIL AZUL',
            photoAvailable: true,

            multipleQuantity: 1,
            innerBoxQuantity: null,
            masterBoxQuantity: 1,

            ipiPercent: 6.5,
            ipiValue: 5.97,
            mvaPercent: 0,
            stValue: 0,

            priceRegionCode: 368,
            priceState: 'SP',
            priceRegionName: 'SAO PAULO',
            priceRegionType: 'UF',

            netPrice: 91.85,
            grossPrice: 97.82,
            discountPercent: 10,
            discountedNetPrice: 82.66,
            discountedGrossPrice: 88.04,

            promotionStart: null,
            promotionEnd: null,
            promotionPercent: 0,
            promotionMinQuantity: null,
            promotionNetPrice: null,
            promotionGrossPrice: null,

            alert: '',
            availableStock: 2815,

            brand: null,
            lineStatus: 'EM LINHA',

            departmentCode: 600,
            departmentName: 'BRINQUEDOS',
            sectionName: 'ACAO E AVENTURA',
            salesCurve: 'B',

            resale: 'S',
          },

          pricing: {
            regular: {
              netUnitPrice: 91.85,
              grossUnitPrice: 97.82,
            },

            discount: {
              percent: 10,
              netUnitPrice: 82.66,
              grossUnitPrice: 88.04,
            },

            promotion: {
              available: false,
              eligible: false,
              minimumQuantity: null,
              percent: 0,
              netUnitPrice: null,
              grossUnitPrice: null,
            },
          },

          totals: {
            regular: {
              net: 1102.2,
              gross: 1173.84,
            },

            discount: {
              net: 991.92,
              gross: 1056.48,
            },

            promotion: {
              eligible: false,
              net: null,
              gross: null,
            },
          },
        },
      ],

      summary: {
        itemCount: 1,
        totalQuantity: 12,

        regular: {
          net: 1102.2,
          gross: 1173.84,
        },

        discount: {
          net: 991.92,
          gross: 1056.48,
        },

        pricingStatus: {
          itemsWithoutPrice: 0,
          promotionAvailableItems: 0,
          promotionEligibleItems: 0,
          promotionIneligibleItems: 0,
          allItemsPriced: true,
          hasPromotionAvailable: false,
          hasPromotionEligible: false,
          hasPromotionPendingQuantity: false,
        },
      },
    };

    calculate.mockResolvedValue(preQuote);

    const result = await service.preview(input);

    expect(calculate).toHaveBeenCalledTimes(1);
    expect(calculate).toHaveBeenCalledWith(input);

    expect(result).toEqual({
      context: {
        plazaCodes: [468],
        discountPercent: 10,
      },

      items: [
        {
          product: {
            productCode: 7624,
            description: 'ANDADOR INFANTIL AZUL',
            photoAvailable: true,

            packaging: {
              multipleQuantity: 1,
              innerBoxQuantity: null,
              masterBoxQuantity: 1,
            },

            taxes: {
              ipiPercent: 6.5,
              ipiValue: 5.97,
              mvaPercent: 0,
              stValue: 0,
            },

            priceRegion: {
              code: 368,
              state: 'SP',
              name: 'SAO PAULO',
              type: 'UF',
            },

            availableStock: 2815,
            alert: '',

            brand: null,
            lineStatus: 'EM LINHA',

            departmentCode: 600,
            departmentName: 'BRINQUEDOS',
            sectionName: 'ACAO E AVENTURA',
            salesCurve: 'B',

            resale: 'S',
          },

          quantity: 12,

          tablePrice: {
            unit: {
              net: 91.85,
              gross: 97.82,
            },
            total: {
              net: 1102.2,
              gross: 1173.84,
            },
          },

          discountedPrice: {
            percent: 10,
            unit: {
              net: 82.66,
              gross: 88.04,
            },
            total: {
              net: 991.92,
              gross: 1056.48,
            },
          },

          promotion: {
            available: false,
            eligible: false,
            minimumQuantity: null,
            percent: 0,
            start: null,
            end: null,

            unit: {
              net: null,
              gross: null,
            },

            total: {
              net: null,
              gross: null,
            },
          },
        },
      ],

      summary: {
        itemCount: 1,
        totalQuantity: 12,

        tablePrice: {
          net: 1102.2,
          gross: 1173.84,
        },

        discountedPrice: {
          net: 991.92,
          gross: 1056.48,
        },

        pricingStatus: {
          itemsWithoutPrice: 0,
          promotionAvailableItems: 0,
          promotionEligibleItems: 0,
          promotionIneligibleItems: 0,
          allItemsPriced: true,
          hasPromotionAvailable: false,
          hasPromotionEligible: false,
          hasPromotionPendingQuantity: false,
        },
      },
    });
  });
});
