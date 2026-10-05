import { Injectable } from '@nestjs/common';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import {
  ProposalPreview,
  ProposalPreviewItem,
} from '../interfaces/proposal-preview.interface';
import { PreQuoteResolvedItem } from '../interfaces/pre-quote-preview.interface';
import { CommercialPreQuoteService } from './commercial-pre-quote.service';

@Injectable()
export class CommercialProposalPreviewService {
  constructor(
    private readonly commercialPreQuoteService: CommercialPreQuoteService,
  ) {}

  async preview(input: PreQuoteCalculateDto): Promise<ProposalPreview> {
    const preQuote = await this.commercialPreQuoteService.calculate(input);

    return {
      context: {
        plazaCodes: [...preQuote.context.plazaCodes],
        discountPercent: preQuote.context.discountPercent,
      },

      items: preQuote.items.map((item) => this.buildItem(item)),

      summary: {
        itemCount: preQuote.summary.itemCount,
        totalQuantity: preQuote.summary.totalQuantity,

        tablePrice: {
          net: preQuote.summary.regular.net,
          gross: preQuote.summary.regular.gross,
        },

        discountedPrice: {
          net: preQuote.summary.discount.net,
          gross: preQuote.summary.discount.gross,
        },

        pricingStatus: {
          ...preQuote.summary.pricingStatus,
        },
      },
    };
  }

  private buildItem(item: PreQuoteResolvedItem): ProposalPreviewItem {
    const { product, pricing, totals } = item;

    return {
      product: {
        productCode: product.productCode,
        description: product.description,
        photoAvailable: product.photoAvailable,

        packaging: {
          multipleQuantity: product.multipleQuantity,
          innerBoxQuantity: product.innerBoxQuantity,
          masterBoxQuantity: product.masterBoxQuantity,
        },

        taxes: {
          ipiPercent: product.ipiPercent,
          ipiValue: product.ipiValue,
          mvaPercent: product.mvaPercent,
          stValue: product.stValue,
        },

        priceRegion: {
          code: product.priceRegionCode,
          state: product.priceState,
          name: product.priceRegionName,
          type: product.priceRegionType,
        },

        availableStock: product.availableStock,
        alert: product.alert,

        brand: product.brand,
        lineStatus: product.lineStatus,

        departmentCode: product.departmentCode,
        departmentName: product.departmentName,
        sectionName: product.sectionName,
        salesCurve: product.salesCurve,

        resale: product.resale,
      },

      quantity: item.quantity,

      tablePrice: {
        unit: {
          net: pricing.regular.netUnitPrice,
          gross: pricing.regular.grossUnitPrice,
        },
        total: {
          net: totals.regular.net,
          gross: totals.regular.gross,
        },
      },

      discountedPrice: {
        percent: pricing.discount.percent,
        unit: {
          net: pricing.discount.netUnitPrice,
          gross: pricing.discount.grossUnitPrice,
        },
        total: {
          net: totals.discount.net,
          gross: totals.discount.gross,
        },
      },

      promotion: {
        available: pricing.promotion.available,
        eligible: pricing.promotion.eligible,
        minimumQuantity: pricing.promotion.minimumQuantity,
        percent: pricing.promotion.percent,
        start: product.promotionStart,
        end: product.promotionEnd,

        unit: {
          net: pricing.promotion.netUnitPrice,
          gross: pricing.promotion.grossUnitPrice,
        },

        total: {
          net: totals.promotion.net,
          gross: totals.promotion.gross,
        },
      },
    };
  }
}
