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

export interface PreQuoteResolvedItem {
  quantity: number;
  product: CatalogItem;
  pricing: PreQuotePricing;
}

export interface PreQuotePreview {
  context: PreQuoteContext;
  items: PreQuoteResolvedItem[];
}
