import { Injectable } from '@nestjs/common';
import { OracleService } from '../../infrastructure/oracle/oracle.service';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import {
  CatalogItem,
  CatalogLineStatus,
  CatalogPriceRegionType,
  CatalogResale,
} from '../interfaces/catalog-item.interface';
import { CatalogQueryBuilder } from './catalog-query.builder';
import { CatalogSearchNormalizerService } from './catalog-search-normalizer.service';

interface CatalogRow {
  PHOTO_PATH: string | null;
  PRODUCT_CODE: number;
  DESCRIPTION: string | null;

  MULTIPLE_QUANTITY: number | null;
  INNER_BOX_QUANTITY: number | null;
  MASTER_BOX_QUANTITY: number | null;

  IPI_PERCENT: number;
  IPI_VALUE: number;
  MVA_PERCENT: number;
  ST_VALUE: number;

  PRICE_REGION_CODE: number;
  PRICE_STATE: string | null;
  PRICE_REGION_NAME: string | null;
  PRICE_REGION_TYPE: CatalogPriceRegionType;

  NET_PRICE: number | null;
  GROSS_PRICE: number | null;
  DISCOUNT_PERCENT: number;
  DISCOUNTED_NET_PRICE: number | null;
  DISCOUNTED_GROSS_PRICE: number | null;

  PROMOTION_START: Date | null;
  PROMOTION_END: Date | null;
  PROMOTION_PERCENT: number;
  PROMOTION_MIN_QUANTITY: number | null;
  PROMOTION_NET_PRICE: number | null;
  PROMOTION_GROSS_PRICE: number | null;

  ALERT: string;
  AVAILABLE_STOCK: number;

  BRAND: string | null;
  LINE_STATUS: CatalogLineStatus;

  DEPARTMENT_CODE: number | null;
  DEPARTMENT_NAME: string | null;
  SECTION_NAME: string | null;
  SALES_CURVE: string | null;

  RESALE: CatalogResale;
}

@Injectable()
export class CommercialCatalogService {
  constructor(
    private readonly oracleService: OracleService,
    private readonly normalizer: CatalogSearchNormalizerService,
    private readonly queryBuilder: CatalogQueryBuilder,
  ) {}

  async search(input: CatalogSearchDto): Promise<CatalogItem[]> {
    const criteria = this.normalizer.normalize(input);
    const query = this.queryBuilder.build(criteria);

    const rows = await this.oracleService.query<CatalogRow>(
      query.sql,
      query.binds,
    );

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: CatalogRow): CatalogItem {
    return {
      productCode: row.PRODUCT_CODE,
      description: row.DESCRIPTION,
      photoAvailable:
        typeof row.PHOTO_PATH === 'string' && row.PHOTO_PATH.trim().length > 0,

      multipleQuantity: row.MULTIPLE_QUANTITY,
      innerBoxQuantity: row.INNER_BOX_QUANTITY,
      masterBoxQuantity: row.MASTER_BOX_QUANTITY,

      ipiPercent: row.IPI_PERCENT,
      ipiValue: row.IPI_VALUE,
      mvaPercent: row.MVA_PERCENT,
      stValue: row.ST_VALUE,

      priceRegionCode: row.PRICE_REGION_CODE,
      priceState: row.PRICE_STATE,
      priceRegionName: row.PRICE_REGION_NAME,
      priceRegionType: row.PRICE_REGION_TYPE,

      netPrice: row.NET_PRICE,
      grossPrice: row.GROSS_PRICE,
      discountPercent: row.DISCOUNT_PERCENT,
      discountedNetPrice: row.DISCOUNTED_NET_PRICE,
      discountedGrossPrice: row.DISCOUNTED_GROSS_PRICE,

      promotionStart: this.toIsoString(row.PROMOTION_START),
      promotionEnd: this.toIsoString(row.PROMOTION_END),
      promotionPercent: row.PROMOTION_PERCENT,
      promotionMinQuantity: row.PROMOTION_MIN_QUANTITY,
      promotionNetPrice: row.PROMOTION_NET_PRICE,
      promotionGrossPrice: row.PROMOTION_GROSS_PRICE,

      alert: row.ALERT,
      availableStock: row.AVAILABLE_STOCK,

      brand: row.BRAND,
      lineStatus: row.LINE_STATUS,

      departmentCode: row.DEPARTMENT_CODE,
      departmentName: row.DEPARTMENT_NAME,
      sectionName: row.SECTION_NAME,
      salesCurve: row.SALES_CURVE,

      resale: row.RESALE,
    };
  }

  private toIsoString(value: Date | null): string | null {
    return value?.toISOString() ?? null;
  }
}
