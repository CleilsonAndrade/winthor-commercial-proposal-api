import {
  CatalogLineStatus,
  CatalogPriceRegionType,
  CatalogResale,
} from './catalog-item.interface';
import { PreQuotePricingStatus } from './pre-quote-preview.interface';
import type { ClientOption } from './client-option.interface';
import type { ParentClientOption } from './parent-client-option.interface';

export interface ProposalPreviewContext {
  plazaCodes: number[];
  discountPercent: number;
  recipient?: ClientOption;
  parentClients?: ParentClientOption[];
}

export interface ProposalPriceValues {
  net: number | null;
  gross: number | null;
}

export interface ProposalPriceBlock {
  unit: ProposalPriceValues;
  total: ProposalPriceValues;
}

export interface ProposalDiscountPriceBlock extends ProposalPriceBlock {
  percent: number;
}

export interface ProposalPromotionPriceBlock extends ProposalPriceBlock {
  available: boolean;
  eligible: boolean;
  minimumQuantity: number | null;
  percent: number;
  start: string | null;
  end: string | null;
}

export interface ProposalProductPackaging {
  multipleQuantity: number | null;
  innerBoxQuantity: number | null;
  masterBoxQuantity: number | null;
}

export interface ProposalProductTaxes {
  ipiPercent: number;
  ipiValue: number;
  mvaPercent: number;
  stValue: number;
}

export interface ProposalProductPriceRegion {
  code: number;
  state: string | null;
  name: string | null;
  type: CatalogPriceRegionType;
}

export interface ProposalProduct {
  productCode: number;
  description: string | null;
  photoAvailable: boolean;

  packaging: ProposalProductPackaging;
  taxes: ProposalProductTaxes;
  priceRegion: ProposalProductPriceRegion;

  availableStock: number;
  alert: string;

  brand: string | null;
  lineStatus: CatalogLineStatus;

  departmentCode: number | null;
  departmentName: string | null;
  sectionName: string | null;
  salesCurve: string | null;

  resale: CatalogResale;
}

export interface ProposalPreviewItem {
  product: ProposalProduct;
  quantity: number;

  tablePrice: ProposalPriceBlock;
  discountedPrice: ProposalDiscountPriceBlock;
  promotion: ProposalPromotionPriceBlock;
}

export interface ProposalPreviewSummary {
  itemCount: number;
  totalQuantity: number;

  tablePrice: ProposalPriceValues;
  discountedPrice: ProposalPriceValues;

  pricingStatus: PreQuotePricingStatus;
}

export interface ProposalPreview {
  context: ProposalPreviewContext;
  items: ProposalPreviewItem[];
  summary: ProposalPreviewSummary;
}
