import { Injectable } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PresenceFilter, ResaleFilter } from '../enums/catalog-filter.enums';
import {
  CatalogSearchCriteria,
  WinthorPresence,
  WinthorYesNo,
} from '../interfaces/catalog-search-criteria.interface';

@Injectable()
export class CatalogSearchNormalizerService {
  normalize(input: CatalogSearchDto): CatalogSearchCriteria {
    return {
      plazaCodes: [...input.plazaCodes],
      departmentCodes: this.normalizeCodes(input.departmentCodes),
      sectionCodes: this.normalizeCodes(input.sectionCodes),
      parentClientCodes: this.normalizeCodes(input.parentClientCodes),
      clientCodes: this.normalizeCodes(input.clientCodes),
      resale: this.normalizeResale(input.resale),
      discountPercent: input.discountPercent,
      maxFinalPrice: input.maxFinalPrice,
      pricePresence: this.normalizePresence(input.pricePresence),
      innerBoxPresence: this.normalizePresence(input.innerBoxPresence),
      minStock: input.minStock,
      purchaseMonths: input.purchaseMonths,
    };
  }

  private normalizeCodes(codes?: number[]): number[] | null {
    if (!codes || codes.length === 0) {
      return null;
    }

    return [...codes];
  }

  private normalizeResale(value: ResaleFilter): WinthorYesNo | null {
    switch (value) {
      case ResaleFilter.YES:
        return 'S';
      case ResaleFilter.NO:
        return 'N';
      case ResaleFilter.ALL:
        return null;
    }
  }

  private normalizePresence(value: PresenceFilter): WinthorPresence {
    switch (value) {
      case PresenceFilter.WITH:
        return 'S';
      case PresenceFilter.WITHOUT:
        return 'N';
      case PresenceFilter.ALL:
        return 'T';
    }
  }
}
