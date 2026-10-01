import { Module } from '@nestjs/common';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { CommercialCatalogController } from './commercial-catalog.controller';
import { CommercialFilterController } from './commercial-filter.controller';
import { CommercialPreQuoteController } from './commercial-pre-quote.controller';
import { CatalogQueryBuilder } from './services/catalog-query.builder';
import { CatalogQueryFilterBuilder } from './services/catalog-query-filter.builder';
import { CatalogSearchNormalizerService } from './services/catalog-search-normalizer.service';
import { CommercialCatalogService } from './services/commercial-catalog.service';
import { CommercialFilterService } from './services/commercial-filter.service';
import { CommercialPreQuoteService } from './services/commercial-pre-quote.service';

@Module({
  imports: [OracleModule],
  controllers: [
    CommercialFilterController,
    CommercialCatalogController,
    CommercialPreQuoteController,
  ],
  providers: [
    CommercialFilterService,
    CatalogSearchNormalizerService,
    CatalogQueryFilterBuilder,
    CatalogQueryBuilder,
    CommercialCatalogService,
    CommercialPreQuoteService,
  ],
  exports: [CommercialFilterService],
})
export class CommercialModule {}
