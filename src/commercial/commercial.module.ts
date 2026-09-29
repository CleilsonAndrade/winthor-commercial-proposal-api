import { Module } from '@nestjs/common';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { CommercialCatalogController } from './commercial-catalog.controller';
import { CommercialFilterController } from './commercial-filter.controller';
import { CatalogQueryBuilder } from './services/catalog-query.builder';
import { CatalogQueryFilterBuilder } from './services/catalog-query-filter.builder';
import { CatalogSearchNormalizerService } from './services/catalog-search-normalizer.service';
import { CommercialCatalogService } from './services/commercial-catalog.service';
import { CommercialFilterService } from './services/commercial-filter.service';

@Module({
  imports: [OracleModule],
  controllers: [CommercialFilterController, CommercialCatalogController],
  providers: [
    CommercialFilterService,
    CatalogSearchNormalizerService,
    CatalogQueryFilterBuilder,
    CatalogQueryBuilder,
    CommercialCatalogService,
  ],
  exports: [CommercialFilterService],
})
export class CommercialModule {}
