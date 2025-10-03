import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { K8sService } from './k8s.service';
import { Metric } from './entities/metric.entity';

@Injectable()
export class MetricsCollectorService {
  constructor(
    @InjectRepository(Metric)
    private metricsRepository: Repository<Metric>,
    private k8sService: K8sService,
  ) {}

  /**
   * 매 1분마다 메트릭 수집 및 저장
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    console.log('🔍 Collecting metrics...');

    try {
      const [nodes, pods] = await Promise.all([
        this.k8sService.getNodes(),
        this.k8sService.getAllPods(),
      ]);

      // CPU 메트릭
      const cpuMetric = await this.k8sService.getCpuMetrics(nodes);
      await this.saveMetric('raspberry-k3s', 'cpu', cpuMetric.current);

      // Memory 메트릭
      const memoryMetric = await this.k8sService.getMemoryMetrics(nodes);
      await this.saveMetric('raspberry-k3s', 'memory', memoryMetric.current);

      // Pods 메트릭
      const runningPods = pods.filter((p) => p.status === 'Running').length;
      await this.saveMetric('raspberry-k3s', 'pods', runningPods);

      // Nodes 메트릭
      const readyNodes = nodes.filter((n) => n.status === 'True').length;
      await this.saveMetric('raspberry-k3s', 'nodes', readyNodes);

      console.log('✅ Metrics saved successfully');
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

  /**
   * 메트릭 저장
   */
  private async saveMetric(
    clusterId: string,
    metricType: string,
    value: number,
  ) {
    const metric = this.metricsRepository.create({
      clusterId,
      metricType,
      value,
    });
    await this.metricsRepository.save(metric);
  }

  /**
   * 특정 기간의 메트릭 조회
   */
  async getMetrics(
    clusterId: string,
    metricType: string,
    timeRange: string,
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const hours = this.parseTimeRange(timeRange);
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await this.metricsRepository.find({
      where: {
        clusterId,
        metricType,
        timestamp: MoreThanOrEqual(since),
      },
      order: {
        timestamp: 'ASC',
      },
    });

    return metrics.map((m) => ({
      timestamp: m.timestamp,
      value: Number(m.value),
    }));
  }

  /**
   * 시간 범위 파싱
   */
  private parseTimeRange(timeRange: string): number {
    if (timeRange.endsWith('h')) {
      return parseInt(timeRange);
    }
    if (timeRange.endsWith('d')) {
      return parseInt(timeRange) * 24;
    }
    return 12;
  }
}