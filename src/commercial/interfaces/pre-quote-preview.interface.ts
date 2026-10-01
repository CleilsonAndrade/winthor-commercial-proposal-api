import { CatalogItem } from './catalog-item.interface';

export interface PreQuoteContext {
  plazaCodes: number[];
  discountPercent: number;
}

export interface PreQuoteRegularPricing {
  netUnitPrice: number | null;
  grossUnitPrice: number | null;
}

export interface PreQuoteDiscountPricing {
  percent: number;
  netUnitPrice: number | null;
  grossUnitPrice: number | null;
}

export interface PreQuotePromotionPricing {
  available: boolean;
  eligible: boolean;
  minimumQuantity: number | null;
  percent: number;
  netUnitPrice: number | null;
  grossUnitPrice: number | null;
}

export interface PreQuotePricing {
  regular: PreQuoteRegularPricing;
  discount: PreQuoteDiscountPricing;
  promotion: PreQuotePromotionPricing;
}

export interface PreQuoteLineTotals {
  net: number | null;
  gross: number | null;
}

export interface PreQuotePromotionTotals extends PreQuoteLineTotals {
  eligible: boolean;
}

export interface PreQuoteTotals {
  regular: PreQuoteLineTotals;
  discount: PreQuoteLineTotals;
  promotion: PreQuotePromotionTotals;
}

export interface PreQuoteResolvedItem {
  quantity: number;
  product: CatalogItem;
  pricing: PreQuotePricing;
  totals: PreQuoteTotals;
}

export interface PreQuotePricingStatus {
  itemsWithoutPrice: number;
  promotionAvailableItems: number;
  promotionEligibleItems: number;
}

export interface PreQuoteSummary {
  itemCount: number;
  totalQuantity: number;
  regular: PreQuoteLineTotals;
  discount: PreQuoteLineTotals;
  pricingStatus: PreQuotePricingStatus;
}

export interface PreQuotePreview {
  context: PreQuoteContext;
  items: PreQuoteResolvedItem[];
  summary: PreQuoteSummary;
}
