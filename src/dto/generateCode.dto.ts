import { IsNotEmpty, IsString, IsUppercase } from 'class-validator';

export class GenerateCodeDto {
  @IsString()
  @IsNotEmpty()
  user_cod: string;

  @IsString()
  @IsUppercase()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsNotEmpty()
  ip: string;
}
