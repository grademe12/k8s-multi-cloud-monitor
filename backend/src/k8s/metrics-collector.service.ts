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


//DB기반 수정 START
async getLatestMetric(
  clusterId: string,
  metricType: string,
): Promise<number | null> {
  const result = await this.metricsRepository.findOne({
    where: { clusterId, metricType },
    order: { timestamp: 'DESC' },
  });
  
  return result ? Number(result.value) : null;
}
//DB기반 수정 END

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

      // 🔧 이상값 필터링 및 보간
      return metrics
        .map((m) => ({
          timestamp: m.timestamp,
          value: Number(m.value),
        }))
        .filter((m) => {
          // CPU/Memory는 0-100 범위만
          if (metricType === 'cpu' || metricType === 'memory') {
            return m.value >= 0 && m.value <= 100;
          }
          return true;
        });
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
  const targetTime = new Date(Date.now() - minutesAgo * 60 * 1000);

  const metrics = await this.metricsRepository.find({
    where: {
      clusterId,
      metricType,
    },
    order: {
      timestamp: 'DESC',
    },
  });


  // minutesAgo 이전 데이터 중 가장 최근 것 찾기
  const previousMetric = metrics.find(m => m.timestamp <= targetTime);
  
  return previousMetric ? Number(previousMetric.value) : null;
}


}