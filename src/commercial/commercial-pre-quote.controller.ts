import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreQuoteCalculateDto } from './dto/pre-quote-calculate.dto';
import { PreQuotePreview } from './interfaces/pre-quote-preview.interface';
import { CommercialPreQuoteService } from './services/commercial-pre-quote.service';

@Controller('commercial/pre-quotes')
@UseGuards(JwtAuthGuard)
export class CommercialPreQuoteController {
  constructor(
    private readonly commercialPreQuoteService: CommercialPreQuoteService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  calculate(@Body() body: PreQuoteCalculateDto): Promise<PreQuotePreview> {
    return this.commercialPreQuoteService.calculate(body);
  }
}
