import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { CatalogItem } from '../interfaces/catalog-item.interface';
import {
  PreQuotePreview,
  PreQuotePricing,
  PreQuoteTotals,
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

        const pricing = this.buildPricing(product, item.quantity);

        return {
          quantity: item.quantity,
          product,
          pricing,
          totals: this.buildTotals(pricing, item.quantity),
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

  private buildTotals(
    pricing: PreQuotePricing,
    quantity: number,
  ): PreQuoteTotals {
    return {
      regular: {
        net: this.calculateLineTotal(pricing.regular.netUnitPrice, quantity),
        gross: this.calculateLineTotal(
          pricing.regular.grossUnitPrice,
          quantity,
        ),
      },

      discount: {
        net: this.calculateLineTotal(pricing.discount.netUnitPrice, quantity),
        gross: this.calculateLineTotal(
          pricing.discount.grossUnitPrice,
          quantity,
        ),
      },

      promotion: {
        eligible: pricing.promotion.eligible,
        net: pricing.promotion.eligible
          ? this.calculateLineTotal(pricing.promotion.netUnitPrice, quantity)
          : null,
        gross: pricing.promotion.eligible
          ? this.calculateLineTotal(pricing.promotion.grossUnitPrice, quantity)
          : null,
      },
    };
  }

  private calculateLineTotal(
    unitPrice: number | null,
    quantity: number,
  ): number | null {
    if (unitPrice === null) {
      return null;
    }

    return Math.round((unitPrice * quantity + Number.EPSILON) * 100) / 100;
  }
}
