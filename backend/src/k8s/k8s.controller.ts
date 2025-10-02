import { Controller, Get, Query } from '@nestjs/common';
import { K8sService } from './k8s.service';

@Controller('k8s')
export class K8sController {
  constructor(private readonly k8sService: K8sService) {}

  @Get('nodes')
  async getNodes() {
    return await this.k8sService.getNodes();
  }

  @Get('pods')
  async getPods(@Query('namespace') namespace?: string) {
    return await this.k8sService.getPods(namespace);
  }
}