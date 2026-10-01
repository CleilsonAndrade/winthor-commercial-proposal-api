export type WinthorYesNo = 'S' | 'N';
export type WinthorPresence = 'T' | 'S' | 'N';

export interface CatalogSearchCriteria {
  plazaCodes: number[];

  /**
   * Restrição interna usada por consumidores do catálogo.
   * Não faz parte do contrato HTTP de busca pública.
   */
  productCodes?: number[] | null;
  departmentCodes: number[] | null;
  sectionCodes: number[] | null;
  parentClientCodes: number[] | null;
  clientCodes: number[] | null;
  resale: WinthorYesNo | null;
  discountPercent: number;
  maxFinalPrice: number;
  pricePresence: WinthorPresence;
  innerBoxPresence: WinthorPresence;
  minStock: number;
  purchaseMonths: number;
}
