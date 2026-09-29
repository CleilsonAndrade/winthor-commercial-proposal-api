import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { PresenceFilter, ResaleFilter } from '../enums/catalog-filter.enums';

export class CatalogSearchDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  plazaCodes!: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  departmentCodes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  sectionCodes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  parentClientCodes?: number[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  clientCodes?: number[];

  @IsOptional()
  @IsEnum(ResaleFilter)
  resale: ResaleFilter = ResaleFilter.ALL;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFinalPrice = 99999;

  @IsOptional()
  @IsEnum(PresenceFilter)
  pricePresence: PresenceFilter = PresenceFilter.ALL;

  @IsOptional()
  @IsEnum(PresenceFilter)
  innerBoxPresence: PresenceFilter = PresenceFilter.ALL;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock = 0;

  @IsOptional()
  @IsInt()
  @Min(0)
  purchaseMonths = 9999;
}
