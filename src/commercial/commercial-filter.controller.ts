import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlazaFilterQueryDto } from './dto/plaza-filter-query.dto';
import { PlazaOption } from './interfaces/plaza-option.interface';
import { CommercialFilterService } from './services/commercial-filter.service';

@Controller('commercial/filters')
@UseGuards(JwtAuthGuard)
export class CommercialFilterController {
  constructor(
    private readonly commercialFilterService: CommercialFilterService,
  ) {}

  @Get('plazas')
  findPlazas(@Query() query: PlazaFilterQueryDto): Promise<PlazaOption[]> {
    return this.commercialFilterService.findPlazas(query.search);
  }
}
