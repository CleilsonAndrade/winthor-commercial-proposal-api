import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { CatalogItem } from '../interfaces/catalog-item.interface';
import {
  PreQuotePreview,
  PreQuotePricing,
} from '../interfaces/pre-quote-preview.interface';
import { CommercialCatalogService } from './commercial-catalog.service';

@Injectable()
export class CommercialPreQuoteService {
  constructor(
    private readonly commercialCatalogService: CommercialCatalogService,
  ) {}

  async calculate(input: PreQuoteCalculateDto): Promise<PreQuotePreview> {
    const catalogInput = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [...input.plazaCodes],
      discountPercent: input.discountPercent,
    });

    const productCodes = input.items.map((item) => item.productCode);

    const catalog = await this.commercialCatalogService.searchByProductCodes(
      catalogInput,
      productCodes,
    );

    const catalogByProductCode = new Map(
      catalog.map((product) => [product.productCode, product]),
    );

    const missingProductCodes = input.items
      .filter((item) => !catalogByProductCode.has(item.productCode))
      .map((item) => item.productCode);

    if (missingProductCodes.length > 0) {
      throw new BadRequestException({
        message:
          'Produtos não encontrados no catálogo para o contexto informado',
        productCodes: missingProductCodes,
      });
    }

    return {
      context: {
        plazaCodes: [...input.plazaCodes],
        discountPercent: input.discountPercent,
      },

      items: input.items.map((item) => {
        const product = catalogByProductCode.get(item.productCode)!;

        return {
          quantity: item.quantity,
          product,
          pricing: this.buildPricing(product, item.quantity),
        };
      }),
    };
  }

  private buildPricing(
    product: CatalogItem,
    quantity: number,
  ): PreQuotePricing {
    const promotionAvailable =
      product.promotionPercent > 0 && product.promotionMinQuantity !== null;

    const promotionEligible =
      promotionAvailable && quantity >= product.promotionMinQuantity!;

    return {
      regular: {
        netUnitPrice: product.netPrice,
        grossUnitPrice: product.grossPrice,
      },

      discount: {
        percent: product.discountPercent,
        netUnitPrice: product.discountedNetPrice,
        grossUnitPrice: product.discountedGrossPrice,
      },

      promotion: {
        available: promotionAvailable,
        eligible: promotionEligible,
        minimumQuantity: promotionAvailable
          ? product.promotionMinQuantity
          : null,
        percent: promotionAvailable ? product.promotionPercent : 0,
        netUnitPrice: promotionAvailable ? product.promotionNetPrice : null,
        grossUnitPrice: promotionAvailable ? product.promotionGrossPrice : null,
      },
    };
  }
}
