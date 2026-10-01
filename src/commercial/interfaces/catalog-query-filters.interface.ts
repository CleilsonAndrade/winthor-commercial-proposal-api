export type CatalogQueryBindValue = number | string;

export interface CatalogQueryFilters {
  priceRegionPredicate: string;
  priceProductPredicate: string | null;
  productPredicates: string[];
  binds: Record<string, CatalogQueryBindValue>;
}
