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
import { ProposalPreview } from './interfaces/proposal-preview.interface';
import { CommercialProposalPreviewService } from './services/commercial-proposal-preview.service';

@Controller('commercial/proposals')
@UseGuards(JwtAuthGuard)
export class CommercialProposalPreviewController {
  constructor(
    private readonly commercialProposalPreviewService: CommercialProposalPreviewService,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Body() body: PreQuoteCalculateDto): Promise<ProposalPreview> {
    return this.commercialProposalPreviewService.preview(body);
  }
}
