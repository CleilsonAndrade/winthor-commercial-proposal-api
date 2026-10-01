import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreQuoteItemDto {
  @IsInt()
  @Min(1)
  productCode!: number;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class PreQuoteCalculateDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  plazaCodes!: number[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent = 0;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique((item: PreQuoteItemDto) => item.productCode)
  @ValidateNested({ each: true })
  @Type(() => PreQuoteItemDto)
  items!: PreQuoteItemDto[];
}
