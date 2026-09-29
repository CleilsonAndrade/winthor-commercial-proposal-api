import { IsOptional, IsString } from 'class-validator';

export class PlazaFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
