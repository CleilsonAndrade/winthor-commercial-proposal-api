import { CatalogQueryBindValue } from './catalog-query-filters.interface';

export interface CatalogQuery {
  sql: string;
  binds: Record<string, CatalogQueryBindValue>;
}
