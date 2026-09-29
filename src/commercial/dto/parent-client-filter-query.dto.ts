import { IsOptional, IsString } from 'class-validator';

export class ParentClientFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
