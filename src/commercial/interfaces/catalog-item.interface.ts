export type CatalogPriceRegionType = 'UF' | 'ESPECIAL';
export type CatalogLineStatus = 'FORA DE LINHA' | 'EM LINHA';
export type CatalogResale = 'S' | 'N';

export interface CatalogItem {
  productCode: number;
  description: string | null;
  photoAvailable: boolean;

  multipleQuantity: number | null;
  innerBoxQuantity: number | null;
  masterBoxQuantity: number | null;

  ipiPercent: number;
  ipiValue: number;
  mvaPercent: number;
  stValue: number;

  priceRegionCode: number;
  priceState: string | null;
  priceRegionName: string | null;
  priceRegionType: CatalogPriceRegionType;

  netPrice: number | null;
  grossPrice: number | null;
  discountPercent: number;
  discountedNetPrice: number | null;
  discountedGrossPrice: number | null;

  promotionStart: string | null;
  promotionEnd: string | null;
  promotionPercent: number;
  promotionMinQuantity: number | null;
  promotionNetPrice: number | null;
  promotionGrossPrice: number | null;

  alert: string;
  availableStock: number;

  brand: string | null;
  lineStatus: CatalogLineStatus;

  departmentCode: number | null;
  departmentName: string | null;
  sectionName: string | null;
  salesCurve: string | null;

  resale: CatalogResale;
}
