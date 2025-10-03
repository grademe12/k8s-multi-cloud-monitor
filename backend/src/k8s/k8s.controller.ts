import { Controller, Get, Query } from '@nestjs/common';
import { K8sService } from './k8s.service';
import { GetStatsQueryDto, K8sStatsResponseDto } from './dto/k8s-stats.dto';

@Controller('k8s')
export class K8sController {
  constructor(private readonly k8sService: K8sService) {}

  /**
   * 클러스터 통계 조회 API
   * GET /k8s/stats?provider=all&stats=cpu,memory,pods,nodes&timeRange=12h
   */
  @Get('stats')
  async getStats(
    @Query('provider') provider: string = 'all',
    @Query('stats') stats: string = 'cpu,memory,pods,nodes',
    @Query('timeRange') timeRange: string = '12h',
  ): Promise<K8sStatsResponseDto> {
    return await this.k8sService.getClusterStats(provider, stats, timeRange);
  }

  /**
   * 노드 목록 조회
   * GET /k8s/nodes
   */
  @Get('nodes')
  async getNodes() {
    return await this.k8sService.getNodes();
  }

  /**
   * Pod 목록 조회
   * GET /k8s/pods?namespace=default
   */
  @Get('pods')
  async getPods(@Query('namespace') namespace?: string) {
    return await this.k8sService.getPods(namespace);
  }
}