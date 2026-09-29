import { IsOptional, IsString } from 'class-validator';

export class DepartmentFilterQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
