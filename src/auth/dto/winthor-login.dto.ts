import { IsNotEmpty, IsString } from 'class-validator';

export class WinthorLoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
