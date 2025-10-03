import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Metric } from './entities/metric.entity';

@Injectable()
export class MetricsCollectorService {
  constructor(
    @InjectRepository(Metric)
    private metricsRepository: Repository<Metric>,
  ) {}

  /**
   * 메트릭 저장 (K8sService에서 호출됨)
   */
  async saveMetric(
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

  /**
 * N분 전 메트릭 조회
 */
async getPreviousMetric(
  clusterId: string,
  metricType: string,
  minutesAgo: number,
): Promise<number | null> {
  const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);

  const metric = await this.metricsRepository.findOne({
    where: {
      clusterId,
      metricType,
    },
    order: {
      timestamp: 'DESC',
    },
  });

  if (!metric) return null;

  // 가장 가까운 과거 데이터 찾기
  const metrics = await this.metricsRepository
    .createQueryBuilder('metric')
    .where('metric.clusterId = :clusterId', { clusterId })
    .andWhere('metric.metricType = :metricType', { metricType })
    .andWhere('metric.timestamp <= :timestamp', { timestamp })
    .orderBy('metric.timestamp', 'DESC')
    .limit(1)
    .getOne();

    return metrics ? Number(metrics.value) : null;
  }
}