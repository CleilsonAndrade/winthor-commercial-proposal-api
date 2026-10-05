import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommercialProductImageService } from './services/commercial-product-image.service';

@Controller('commercial/products')
@UseGuards(JwtAuthGuard)
export class CommercialProductImageController {
  constructor(
    private readonly commercialProductImageService: CommercialProductImageService,
  ) {}

  @Get(':productCode/image')
  async getImage(
    @Param('productCode', ParseIntPipe) productCode: number,
  ): Promise<StreamableFile> {
    const image = await this.commercialProductImageService.get(productCode);

    return new StreamableFile(image.stream, {
      type: image.contentType,
      disposition: `inline; filename="${image.fileName}"`,
    });
  }
}
