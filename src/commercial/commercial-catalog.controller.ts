import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CatalogSearchDto } from './dto/catalog-search.dto';
import { CatalogItem } from './interfaces/catalog-item.interface';
import { CommercialCatalogService } from './services/commercial-catalog.service';

@Controller('commercial/catalog')
@UseGuards(JwtAuthGuard)
export class CommercialCatalogController {
  constructor(
    private readonly commercialCatalogService: CommercialCatalogService,
  ) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  search(@Body() body: CatalogSearchDto): Promise<CatalogItem[]> {
    return this.commercialCatalogService.search(body);
  }
}
