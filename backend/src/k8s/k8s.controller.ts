import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { K8sService } from './k8s.service';
import { GetStatsQueryDto, K8sStatsResponseDto } from './dto/k8s-stats.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('k8s')
@UseGuards(JwtAuthGuard)
export class K8sController {
  constructor(private readonly k8sService: K8sService) {}

  /**
   * 클러스터 통계 조회 API
   * GET /k8s/stats?clusterId=all&stats=cpu,memory,pods,nodes&timeRange=12h
   */
  @Get('stats')
  async getStats(
    @Request() req,
    @Query('clusterId') clusterId: string = 'all',  // provider 대신 clusterId 사용
    @Query('stats') stats: string = 'cpu,memory,pods,nodes',
    @Query('timeRange') timeRange: string = '12h',
  ): Promise<K8sStatsResponseDto> {
    return await this.k8sService.getClusterStats(
      req.user.id, 
      clusterId,  // clusterId 전달
      stats, 
      timeRange
    );
  }

  /**
   * 노드 목록 조회
   * GET /k8s/nodes
   */
  @Get('nodes')
  async getNodes(
    @Request() req,
    @Query('clusterId') clusterId: string
  ) {
    return await this.k8sService.getNodes(clusterId);
  }

  /**
   * Pod 목록 조회
   * GET /k8s/pods?namespace=default
   */
  @Get('pods')
  async getPods(
    @Request() req,
    @Query('clusterId') clusterId: string,
    @Query('namespace') namespace?: string
  ) {
    return await this.k8sService.getPods(clusterId, namespace);
  }
}