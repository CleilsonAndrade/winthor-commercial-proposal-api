import { IsOptional, IsString } from 'class-validator';

export class SectionFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
