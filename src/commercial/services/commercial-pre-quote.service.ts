import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogSearchDto } from '../dto/catalog-search.dto';
import { PreQuoteCalculateDto } from '../dto/pre-quote-calculate.dto';
import { PreQuotePreview } from '../interfaces/pre-quote-preview.interface';
import { CommercialCatalogService } from './commercial-catalog.service';

@Injectable()
export class CommercialPreQuoteService {
  constructor(
    private readonly commercialCatalogService: CommercialCatalogService,
  ) {}

  async calculate(input: PreQuoteCalculateDto): Promise<PreQuotePreview> {
    const catalogInput = Object.assign(new CatalogSearchDto(), {
      plazaCodes: [...input.plazaCodes],
      discountPercent: input.discountPercent,
    });

    const catalog = await this.commercialCatalogService.search(catalogInput);

    const catalogByProductCode = new Map(
      catalog.map((product) => [product.productCode, product]),
    );

    const missingProductCodes = input.items
      .filter((item) => !catalogByProductCode.has(item.productCode))
      .map((item) => item.productCode);

    if (missingProductCodes.length > 0) {
      throw new BadRequestException({
        message:
          'Produtos não encontrados no catálogo para o contexto informado',
        productCodes: missingProductCodes,
      });
    }

    return {
      context: {
        plazaCodes: [...input.plazaCodes],
        discountPercent: input.discountPercent,
      },
      items: input.items.map((item) => ({
        quantity: item.quantity,
        product: catalogByProductCode.get(item.productCode)!,
      })),
    };
  }
}
