import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientFilterQueryDto } from './dto/client-filter-query.dto';
import { DepartmentFilterQueryDto } from './dto/department-filter-query.dto';
import { ParentClientFilterQueryDto } from './dto/parent-client-filter-query.dto';
import { PlazaFilterQueryDto } from './dto/plaza-filter-query.dto';
import { SectionFilterQueryDto } from './dto/section-filter-query.dto';
import { ClientOption } from './interfaces/client-option.interface';
import { DepartmentOption } from './interfaces/department-option.interface';
import { ParentClientOption } from './interfaces/parent-client-option.interface';
import { PlazaOption } from './interfaces/plaza-option.interface';
import { SectionOption } from './interfaces/section-option.interface';
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

  @Get('clients')
  findClients(@Query() query: ClientFilterQueryDto): Promise<ClientOption[]> {
    return this.commercialFilterService.findClients(
      query.search,
      query.documentPrefix,
    );
  }

  @Get('departments')
  findDepartments(
    @Query() query: DepartmentFilterQueryDto,
  ): Promise<DepartmentOption[]> {
    return this.commercialFilterService.findDepartments(query.search);
  }

  @Get('parent-clients')
  findParentClients(
    @Query() query: ParentClientFilterQueryDto,
  ): Promise<ParentClientOption[]> {
    return this.commercialFilterService.findParentClients(query.search);
  }

  @Get('sections')
  findSections(
    @Query() query: SectionFilterQueryDto,
  ): Promise<SectionOption[]> {
    return this.commercialFilterService.findSections(query.search);
  }
}
