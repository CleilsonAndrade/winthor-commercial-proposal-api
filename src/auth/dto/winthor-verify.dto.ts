import { IsNotEmpty, IsString } from 'class-validator';

export class WinthorVerifyDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
