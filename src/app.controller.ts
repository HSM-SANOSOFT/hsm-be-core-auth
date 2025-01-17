import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { Payload } from '@nestjs/microservices';

import { AppService } from './app.service';
import { AuthLoginDto } from './dto/authLogin.dto';
import { GenerateCodeDto } from './dto/generateCode.dto';
import { UserMenuDto } from './dto/usermenu.dto';
import { ValidateCodeDto } from './dto/validateCode.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @MessagePattern('init')
  InitMS() {
    return this.appService.InitMS();
  }

  @MessagePattern('initMSA')
  InitMSA() {
    return 'microservice Auth from Microservice User ';
  }

  @MessagePattern('login')
  login(@Payload() authLoginDto: AuthLoginDto) {
    return this.appService.login(authLoginDto);
  }

  @MessagePattern('logout')
  logout(@Payload() authHeader: string) {
    return this.appService.logout(authHeader);
  }

  @MessagePattern('usermenu')
  usermenu(@Payload() usermenuDto: UserMenuDto) {
    return this.appService.usermenu(usermenuDto);
  }

  @MessagePattern('generateCode')
  generateCode(generatecodeDto: GenerateCodeDto) {
    return this.appService.generateCode(generatecodeDto);
  }

  @MessagePattern('validateCode')
  validateCode(@Payload() validateCodeDto: ValidateCodeDto) {
    return this.appService.validateCode(validateCodeDto);
  }
}
