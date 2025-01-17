import { IsNotEmpty, IsString } from 'class-validator';

export class UserMenuDto {
  @IsString()
  @IsNotEmpty()
  usercode: string;
}
