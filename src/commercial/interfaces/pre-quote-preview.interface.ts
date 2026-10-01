import { CatalogItem } from './catalog-item.interface';

export interface PreQuoteContext {
  plazaCodes: number[];
  discountPercent: number;
}

export interface PreQuoteResolvedItem {
  quantity: number;
  product: CatalogItem;
}

export interface PreQuotePreview {
  context: PreQuoteContext;
  items: PreQuoteResolvedItem[];
}
