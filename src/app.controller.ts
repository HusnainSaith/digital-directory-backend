import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { BaseController } from './common/controllers/base.controller';

@Controller()
export class AppController extends BaseController {
  constructor(private readonly appService: AppService) {
    super();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}