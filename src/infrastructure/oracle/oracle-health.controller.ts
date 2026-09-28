import { Controller, Get } from '@nestjs/common';
import { OracleHealthResult, OracleService } from './oracle.service';

@Controller('health')
export class OracleHealthController {
  constructor(private readonly oracleService: OracleService) {}

  @Get('oracle')
  check(): Promise<OracleHealthResult> {
    return this.oracleService.health();
  }
}
