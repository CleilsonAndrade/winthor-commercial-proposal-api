import { IsOptional, IsString } from 'class-validator';

export class ClientFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  documentPrefix?: string;
}
