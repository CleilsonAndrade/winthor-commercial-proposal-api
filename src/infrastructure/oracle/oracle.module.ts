import { Module } from '@nestjs/common';
import { OracleHealthController } from './oracle-health.controller';
import { OracleService } from './oracle.service';

@Module({
  controllers: [OracleHealthController],
  providers: [OracleService],
  exports: [OracleService],
})
export class OracleModule {}
