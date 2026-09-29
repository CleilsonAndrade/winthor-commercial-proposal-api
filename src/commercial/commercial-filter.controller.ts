import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepartmentFilterQueryDto } from './dto/department-filter-query.dto';
import { PlazaFilterQueryDto } from './dto/plaza-filter-query.dto';
import { DepartmentOption } from './interfaces/department-option.interface';
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

  @Get('departments')
  findDepartments(
    @Query() query: DepartmentFilterQueryDto,
  ): Promise<DepartmentOption[]> {
    return this.commercialFilterService.findDepartments(query.search);
  }
}
