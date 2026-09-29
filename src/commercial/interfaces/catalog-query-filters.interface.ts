export type CatalogQueryBindValue = number | string;

export interface CatalogQueryFilters {
  priceRegionPredicate: string;
  productPredicates: string[];
  binds: Record<string, CatalogQueryBindValue>;
}
