import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { CatalogItem } from '../interfaces/catalog-item.interface';
import {
  PreQuotePreview,
  PreQuotePricing,
  PreQuoteResolvedItem,
  PreQuoteSummary,
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

    const items: PreQuoteResolvedItem[] = input.items.map((item) => {
      const product = catalogByProductCode.get(item.productCode)!;

      const pricing = this.buildPricing(product, item.quantity);

      return {
        quantity: item.quantity,
        product,
        pricing,
        totals: this.buildTotals(pricing, item.quantity),
      };
    });

    return {
      context: {
        plazaCodes: [...input.plazaCodes],
        discountPercent: input.discountPercent,
      },
      items,
      summary: this.buildSummary(items),
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

  private buildSummary(items: PreQuoteResolvedItem[]): PreQuoteSummary {
    return {
      itemCount: items.length,

      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),

      regular: {
        net: this.sumCompleteLineTotals(
          items.map((item) => item.totals.regular.net),
        ),
        gross: this.sumCompleteLineTotals(
          items.map((item) => item.totals.regular.gross),
        ),
      },

      discount: {
        net: this.sumCompleteLineTotals(
          items.map((item) => item.totals.discount.net),
        ),
        gross: this.sumCompleteLineTotals(
          items.map((item) => item.totals.discount.gross),
        ),
      },

      pricingStatus: {
        itemsWithoutPrice: items.filter(
          (item) =>
            item.totals.regular.net === null ||
            item.totals.regular.gross === null,
        ).length,

        promotionAvailableItems: items.filter(
          (item) => item.pricing.promotion.available,
        ).length,

        promotionEligibleItems: items.filter(
          (item) => item.pricing.promotion.eligible,
        ).length,
      },
    };
  }

  private sumCompleteLineTotals(values: Array<number | null>): number | null {
    const completeValues = values.filter(
      (value): value is number => value !== null,
    );

    if (completeValues.length !== values.length) {
      return null;
    }

    const totalInCents = completeValues.reduce(
      (total, value) => total + Math.round(value * 100),
      0,
    );

    return totalInCents / 100;
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
