import { Module } from '@nestjs/common';
import { OracleModule } from '../infrastructure/oracle/oracle.module';
import { CommercialFilterController } from './commercial-filter.controller';
import { CommercialFilterService } from './services/commercial-filter.service';

@Module({
  imports: [OracleModule],
  controllers: [CommercialFilterController],
  providers: [CommercialFilterService],
  exports: [CommercialFilterService],
})
export class CommercialModule {}
