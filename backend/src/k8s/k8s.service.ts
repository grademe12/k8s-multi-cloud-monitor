import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import { Cron, CronExpression } from '@nestjs/schedule'
import { MetricsCollectorService } from './metrics-collector.service';
import {
  K8sStatsResponseDto,
  MetricDto,
  ChartDataPointDto,
  ClusterDto,
} from './dto/k8s-stats.dto';
import * as https from 'https';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cluster } from '../clusters/entities/cluster.entity';

@Injectable()
export class K8sService {
  // private kubeConfig: k8s.KubeConfig; 단일 kubeconfig 제거

  constructor(
    private configService: ConfigService,
    private metricsCollector: MetricsCollectorService,
    @InjectRepository(Cluster)
    private clusterRepository: Repository<Cluster>,
  ) {
    // this.initializeCluster();
  }

  // private initializeCluster() {
  //   this.kubeConfig = new k8s.KubeConfig();

  //   this.kubeConfig.loadFromOptions({
  //     clusters: [
  //       {
  //         name: 'raspberry',
  //         server: this.configService.get('RASPBERRY_K8S_HOST'),
  //         skipTLSVerify:
  //           this.configService.get('RASPBERRY_K8S_SKIP_TLS') === 'true',
  //       },
  //     ],
  //     users: [
  //       {
  //         name: 'monitor-sa',
  //         token: this.configService.get('RASPBERRY_K8S_TOKEN'),
  //       },
  //     ],
  //     contexts: [
  //       {
  //         name: 'raspberry-context',
  //         cluster: 'raspberry',
  //         user: 'monitor-sa',
  //       },
  //     ],
  //     currentContext: 'raspberry-context',
  //   });
  // } 고정 클러스터 제거

    /**
   * 클러스터별 KubeConfig 생성
   */
  private createKubeConfig(cluster: Cluster): k8s.KubeConfig {
    const kubeConfig = new k8s.KubeConfig();
    
    kubeConfig.loadFromOptions({
      clusters: [{
        name: cluster.name,
        server: cluster.apiEndpoint,
        skipTLSVerify: true,
      }],
      users: [{
        name: `${cluster.name}-user`,
        token: cluster.token,
      }],
      contexts: [{
        name: `${cluster.name}-context`,
        cluster: cluster.name,
        user: `${cluster.name}-user`,
      }],
      currentContext: `${cluster.name}-context`,
    });

    return kubeConfig;
  }

    /**
   * 특정 클러스터의 노드 조회
   */
  async getNodes(clusterId: string) {
    const cluster = await this.clusterRepository.findOne({ 
      where: { id: clusterId },
      select: ['id', 'name', 'apiEndpoint', 'token']
    });

    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not found`);
    }

    const kubeConfig = this.createKubeConfig(cluster);
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);

    try {
      const response = await k8sApi.listNode();
      return response.items.map(node => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find(c => c.type === 'Ready')?.status,
        version: node.status?.nodeInfo?.kubeletVersion,
      }));
    } catch (error) {
      console.error(`Failed to get nodes for cluster ${cluster.name}:`, error.message);
      return [];
    }
  }

  // async getNodes() {
  //   try {
  //     const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  //     const response = await k8sApi.listNode();

  //     return response.items.map((node) => ({
  //       name: node.metadata?.name,
  //       status: node.status?.conditions?.find((c) => c.type === 'Ready')
  //         ?.status,
  //       capacity: {
  //         cpu: node.status?.capacity?.cpu,
  //         memory: node.status?.capacity?.memory,
  //       },
  //     }));
  //   } catch (error) {
  //     throw new Error(`Failed to get nodes: ${error.message}`);
  //   }
  // }

    /**
   * 특정 클러스터의 Pod 조회
   */
  async getPods(clusterId: string, namespace?: string) {
    const cluster = await this.clusterRepository.findOne({ 
      where: { id: clusterId },
      select: ['id', 'name', 'apiEndpoint', 'token']
    });

    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not found`);
    }

    const kubeConfig = this.createKubeConfig(cluster);
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);

    try {
      let response;
      
      if (!namespace || namespace === 'all') {
        response = await k8sApi.listPodForAllNamespaces();
      } else {
        response = await k8sApi.listNamespacedPod({ namespace });
      }
      
      return response.items.map(pod => ({
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase,
        nodeName: pod.spec?.nodeName,
      }));
    } catch (error) {
      console.error(`Failed to get pods for cluster ${cluster.name}:`, error.message);
      return [];
    }
  }

// async getPods(namespace?: string) {
//   try {
//     const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    
//     let response;
    
//     // namespace 파라미터가 없으면 모든 네임스페이스 조회
//     if (!namespace || namespace === 'all') {
//       response = await k8sApi.listPodForAllNamespaces();
//     } else {
//       response = await k8sApi.listNamespacedPod({
//         namespace: namespace,
//       });
//     }
    
//     return response.items.map(pod => ({
//       name: pod.metadata?.name,
//       namespace: pod.metadata?.namespace,
//       status: pod.status?.phase,
//       nodeName: pod.spec?.nodeName,
//     }));
//   } catch (error) {
//     throw new Error(`Failed to get pods: ${error.message}`);
//   }
// }

  /**
   * 클러스터 통계 수집
   */
// async getClusterStats(
//   userId: string,  // ← 사용자 ID 추가
//   provider: string,
//   statsParam: string,
//   timeRange: string,
// ): Promise<K8sStatsResponseDto> {
//   const requestedStats = statsParam.split(',');

//   // 사용자의 클러스터 조회
//   let clusters = await this.clusterRepository.find({
//     where: { userId },
//     select: ['id', 'name', 'provider', 'apiEndpoint', 'region', 'version']
//   });

//   // Provider 필터링
//   if (provider && provider !== 'all') {
//     clusters = clusters.filter(c => 
//       c.provider.toLowerCase().includes(provider.toLowerCase())
//     );
//   }

//   // 각 클러스터의 메트릭 DB에서 조회
//   const metrics = await this.calculateMetrics(requestedStats, clusters[0]?.id);

//   // 차트 데이터
//   const charts = await this.generateCharts(requestedStats, timeRange, clusters[0]?.id, metrics);

//   // 클러스터 정보
//   const clustersInfo = await Promise.all(
//     clusters.map(async (cluster) => {
//       const [nodes, pods] = await Promise.all([
//         this.getNodes(cluster.id),
//         this.getPods(cluster.id),
//       ]);

//       return {
//         id: cluster.id,
//         name: cluster.name,
//         provider: cluster.provider,
//         status: 'healthy' as const,
//         nodes: nodes.length,
//         pods: pods.length,
//         version: cluster.version || 'unknown',
//       };
//     })
//   );

//   return {
//     metrics,
//     charts,
//     clusters: clustersInfo,
//   };
// }

async getClusterStats(
  userId: string,
  clusterId: string,  // 특정 클러스터 ID 또는 'all'
  statsParam: string,
  timeRange: string,
): Promise<K8sStatsResponseDto> {
  const requestedStats = statsParam.split(',');

  // 사용자의 클러스터 조회
  let clusters = await this.clusterRepository.find({
    where: { userId },
    select: ['id', 'name', 'provider', 'apiEndpoint', 'region', 'version', 'token']
  });

  // 클러스터가 없으면 빈 응답 반환
  if (clusters.length === 0) {
    return {
      metrics: {},
      charts: {},
      clusters: [],
    };
  }

  // clusterId가 지정되면 해당 클러스터만 선택, 아니면 전체
  let selectedCluster: Cluster | null = null;
  if (clusterId && clusterId !== 'all') {
    selectedCluster = clusters.find(c => c.id === clusterId) || null;
    if (!selectedCluster) {
      throw new Error(`Cluster ${clusterId} not found`);
    }
  }

  // 메트릭과 차트 데이터 수집
  let aggregatedMetrics: any = {};
  let aggregatedCharts: any = {};

  if (selectedCluster) {
    // 특정 클러스터의 메트릭만 조회
    aggregatedMetrics = await this.calculateMetrics(requestedStats, selectedCluster.id);
    aggregatedCharts = await this.generateCharts(requestedStats, timeRange, selectedCluster.id, aggregatedMetrics);
  } else {
    // 모든 클러스터의 메트릭을 집계
    const allMetrics = await Promise.all(
      clusters.map(cluster => this.calculateMetrics(requestedStats, cluster.id))
    );
    
    // 평균값 계산
    aggregatedMetrics = this.aggregateMetrics(allMetrics, requestedStats);
    
    // 모든 클러스터의 차트 데이터를 합쳐서 표시
    const allCharts = await Promise.all(
      clusters.map(cluster => 
        this.generateCharts(requestedStats, timeRange, cluster.id, aggregatedMetrics)
      )
    );
    
    // 차트 데이터 병합 (시간별로 정렬)
    aggregatedCharts = this.mergeChartData(allCharts, requestedStats);
  }

  // 클러스터 정보 수집
  const clustersInfo = await Promise.all(
    clusters.map(async (cluster) => {
      try {
        const [nodes, pods] = await Promise.all([
          this.getNodes(cluster.id),
          this.getPods(cluster.id),
        ]);

        // 해당 클러스터의 최신 메트릭 조회
        const clusterMetrics = await this.calculateMetrics(requestedStats, cluster.id);

        return {
          id: cluster.id,
          name: cluster.name,
          provider: cluster.provider,
          status: this.determineClusterStatus(clusterMetrics),
          nodes: nodes.length,
          pods: pods.length,
          version: cluster.version || 'unknown',
        };
      } catch (error) {
        console.error(`Failed to get info for cluster ${cluster.name}:`, error.message);
        return {
          id: cluster.id,
          name: cluster.name,
          provider: cluster.provider,
          status: 'critical' as const,
          nodes: 0,
          pods: 0,
          version: cluster.version || 'unknown',
        };
      }
    })
  );

  return {
    metrics: aggregatedMetrics,
    charts: aggregatedCharts,
    clusters: clustersInfo,
  };
}

/**
 * 여러 클러스터의 메트릭을 평균값으로 집계
 */
private aggregateMetrics(allMetrics: any[], requestedStats: string[]): any {
  const aggregated: any = {};
  
  for (const stat of requestedStats) {
    const validMetrics = allMetrics
      .map(m => m[stat])
      .filter(m => m !== undefined);
    
    if (validMetrics.length > 0) {
      const avgCurrent = validMetrics.reduce((sum, m) => sum + m.current, 0) / validMetrics.length;
      const avgTrend = validMetrics.reduce((sum, m) => sum + m.trend, 0) / validMetrics.length;
      
      aggregated[stat] = {
        current: Math.round(avgCurrent * 10) / 10,
        trend: Math.round(avgTrend * 10) / 10,
        status: this.getMetricStatus(stat, avgCurrent),
      };
    }
  }
  
  return aggregated;
}

/**
 * 여러 클러스터의 차트 데이터를 병합
 */
private mergeChartData(allCharts: any[], requestedStats: string[]): any {
  const merged: any = {};
  
  for (const stat of requestedStats) {
    const allStatCharts = allCharts
      .map(charts => charts[stat])
      .filter(chart => chart && chart.length > 0);
    
    if (allStatCharts.length > 0) {
      // 모든 시간대의 데이터를 수집
      const timeMap = new Map<string, number[]>();
      
      for (const chart of allStatCharts) {
        for (const point of chart) {
          if (!timeMap.has(point.time)) {
            timeMap.set(point.time, []);
          }
          timeMap.get(point.time)?.push(point.value);
        }
      }
      
      // 시간대별 평균 계산
      merged[stat] = Array.from(timeMap.entries())
        .map(([time, values]) => ({
          time,
          value: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10
        }))
        .sort((a, b) => {
          // 시간순 정렬 (예: "2h ago" < "1h ago" < "now")
          const getTimeValue = (time: string) => {
            if (time === 'now') return 0;
            const match = time.match(/(\d+)([hmd]) ago/);
            if (!match) return -1;
            const [, num, unit] = match;
            const multiplier = unit === 'm' ? 1 : unit === 'h' ? 60 : 1440;
            return parseInt(num) * multiplier;
          };
          return getTimeValue(b.time) - getTimeValue(a.time);
        });
    }
  }
  
  return merged;
}

/**
 * 클러스터의 전체 상태 판단
 */
private determineClusterStatus(metrics: any): 'healthy' | 'warning' | 'critical' {
  const statuses = Object.values(metrics)
    .filter((m: any) => m && m.status)
    .map((m: any) => m.status);
  
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  return 'healthy';
}

  /**
   * 모든 네임스페이스의 Pod 조회
   */
  // public async getAllPods() {
  //   try {
  //     const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
  //     const response = await k8sApi.listPodForAllNamespaces();
  //     return response.items;
  //   } catch (error) {
  //     console.error('Failed to get all pods:', error);
  //     return [];
  //   }
  // }

  /*
   * Metrics 계산
   */
private async calculateMetrics(
  requestedStats: string[],
  clusterId: string,  // ← 추가!
) {
  const metrics: any = {};

  // Network는 Mock 데이터
  if (requestedStats.includes('network')) {
    metrics.network = {
      current: 523,
      trend: 2.5,
      status: 'healthy',
    };
  }

  // 나머지는 DB에서 조회
  for (const stat of requestedStats) {
    // Network는 이미 처리했으니 스킵
    if (stat === 'network') continue;
    
    const metricType = this.getMetricTypeMapping(stat);
    
    // DB에서 최신 값 조회
    const latest = await this.metricsCollector.getLatestMetric(
      clusterId,  // ← 하드코딩 'raspberry-k3s' 대신 파라미터 사용!
      metricType,
    );
    
    // DB에서 5분 전 값 조회
    const previous = await this.metricsCollector.getPreviousMetric(
      clusterId,  // ← 여기도!
      metricType,
      5,
    );

    const current = latest || 0;
    const trend = this.calculateTrend(current, previous || current);
    
    metrics[stat] = {
      current,
      trend,
      status: this.getMetricStatus(stat, current),
    };
  }

  return metrics;
}

    private getMetricTypeMapping(stat: string): string {
  const mapping: Record<string, string> = {
    'cpu': 'cpu',
    'memory': 'memory',
    'pods': 'pods',
    'nodes': 'nodes',
    'storage': 'storage',
    'requests': 'requests',
    'errors': 'pod_error_rate',
    'network': 'network',
  };
  return mapping[stat] || stat;
}

private getMetricStatus(stat: string, value: number): 'healthy' | 'warning' | 'critical' {
  const thresholds: Record<string, { warning: number; critical: number }> = {
    'cpu': { warning: 60, critical: 80 },
    'memory': { warning: 70, critical: 85 },
    'storage': { warning: 75, critical: 90 },
    'errors': { warning: 5, critical: 10 },
  };

  const threshold = thresholds[stat];
  if (!threshold) return 'healthy';

  if (value >= threshold.critical) return 'critical';
  if (value >= threshold.warning) return 'warning';
  return 'healthy';
}
//DB 기반 변환 END

  /**
   * CPU Metrics 수집 (K8s Metrics Server 필요)
   */
  private async getCpuMetricsForCluster(
    kubeConfig: k8s.KubeConfig,  // ← 파라미터로 받음!
    nodes: any[],
  ): Promise<MetricDto> {
    try {
      const metricsClient = new k8s.Metrics(kubeConfig);  // ← 전달받은 config 사용
      const nodeMetrics = await metricsClient.getNodeMetrics();

      const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);  // ← 전달받은 config 사용
      const nodesResponse = await k8sApi.listNode();

      let totalUsagePercent = 0;

      for (let i = 0; i < nodeMetrics.items.length; i++) {
        const metric = nodeMetrics.items[i];
        const node = nodesResponse.items.find(
          (n) => n.metadata?.name === metric.metadata.name,
        );

        if (node && node.status?.capacity?.cpu) {
          const usageNano = this.parseCpuToNano(metric.usage.cpu);
          const capacityCores = this.parseCpuString(node.status.capacity.cpu);
          const capacityNano = capacityCores * 1000000000;

          const usagePercent = (usageNano / capacityNano) * 100;
          totalUsagePercent += usagePercent;
        }
      }

      const avgCpuPercent = totalUsagePercent / nodeMetrics.items.length || 0;
      const current = Math.round(avgCpuPercent * 10) / 10;

      return {
        current,
        trend: 0,
        status: this.getStatus(current, 80, 60),
      };
    } catch (error) {
      console.error('CPU metrics error:', error.message);
      return {
        current: 0,
        trend: 0,
        status: 'healthy',
      };
    }
  }
  /**
   * Memory Metrics 수집
   */
      private async getMemoryMetricsForCluster(
        kubeConfig: k8s.KubeConfig,
        nodes: any[]
      ): Promise<MetricDto> {
        try {
          const metricsClient = new k8s.Metrics(kubeConfig);  // ✅
          const nodeMetrics = await metricsClient.getNodeMetrics();

          const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);  // ✅
          const nodesResponse = await k8sApi.listNode();

          let totalUsagePercent = 0;

          for (let i = 0; i < nodeMetrics.items.length; i++) {
            const metric = nodeMetrics.items[i];
            const node = nodesResponse.items.find(
              (n) => n.metadata?.name === metric.metadata.name,
            );

            if (node && node.status?.capacity?.memory) {
              const usageBytes = this.parseMemoryToBytes(metric.usage.memory);
              const capacityBytes = this.parseMemoryToBytes(
                node.status.capacity.memory,
              );

              const usagePercent = (usageBytes / capacityBytes) * 100;
              totalUsagePercent += usagePercent;
            }
          }

          const avgMemPercent = totalUsagePercent / nodeMetrics.items.length || 0;
          const current = Math.round(avgMemPercent * 10) / 10;

          return {
            current,
            trend: 0,
            status: this.getStatus(current, 85, 70),
          };
        } catch (error) {
          console.error('Memory metrics error:', error.message);
          return {
            current: 0,
            trend: 0,
            status: 'healthy',
          };
        }
      }

  /**
 * Charts 데이터 생성 - DB에서 실제 데이터 조회
 */
    private async generateCharts(
      requestedStats: string[],
      timeRange: string,
      clusterId: string,  // ← 추가!
      metrics: any,
    ) {
      const charts: any = {};

      // CPU 차트
      if (requestedStats.includes('cpu')) {
        const cpuData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'cpu',
          timeRange,
        );
        charts.cpu = this.formatChartData(cpuData);
      }

      // Memory 차트
      if (requestedStats.includes('memory')) {
        const memoryData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'memory',
          timeRange,
        );
        charts.memory = this.formatChartData(memoryData);
      }

      // Pods 차트
      if (requestedStats.includes('pods')) {
        const podsData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'pods',
          timeRange,
        );
        charts.pods = this.formatChartData(podsData);
      }

      // Nodes 차트
      if (requestedStats.includes('nodes')) {
        const nodesData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'nodes',
          timeRange,
        );
        charts.nodes = this.formatChartData(nodesData);
      }

      // Storage 차트
      if (requestedStats.includes('storage')) {
        const storageData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'storage',
          timeRange,
        );
        charts.storage = this.formatChartData(storageData);
        
        if (!charts.storage || charts.storage.length === 0) {
          charts.storage = [{ time: 'now', value: metrics.storage?.current || 0 }];
        }
      }

      // Requests 차트
      if (requestedStats.includes('requests')) {
        const requestsData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'requests',
          timeRange,
        );
        charts.requests = this.formatChartData(requestsData);
        
        if (!charts.requests || charts.requests.length === 0) {
          charts.requests = [{ time: 'now', value: metrics.requests?.current || 0 }];
        }
      }

      // Error Rate
      if (requestedStats.includes('errors')) {
        const errorData = await this.metricsCollector.getMetrics(
          clusterId,  // ← 변경!
          'pod_error_rate',
          timeRange,
        );
        charts.errors = this.formatChartData(errorData);
        
        if (!charts.errors || charts.errors.length === 0) {
          charts.errors = [{ time: 'now', value: metrics.errors?.current || 0 }];
        }
      }

      // 데이터가 없으면 현재 값으로 폴백
      if (requestedStats.includes('cpu') && (!charts.cpu || charts.cpu.length === 0)) {
        charts.cpu = [{ time: 'now', value: metrics.cpu?.current || 0 }];
      }

      if (requestedStats.includes('memory') && (!charts.memory || charts.memory.length === 0)) {
        charts.memory = [{ time: 'now', value: metrics.memory?.current || 0 }];
      }

      return charts;
    }

/**
 * DB 데이터를 차트 형식으로 변환
 */
private formatChartData(
  data: Array<{ timestamp: Date; value: number }>,
): Array<{ time: string; value: number }> {
  return data.map((d) => ({
    time: this.formatTime(d.timestamp),
    value: d.value,
  }));
}

/**
 * 시간 포맷 (상대 시간)
 */
private formatTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    return `${diffHours}h ago`;
  }
  return `${diffMins}m ago`;
}

  // /**
  //  * Clusters 정보 조회
  //  */
  // // private async getClustersInfo(provider: string): Promise<ClusterDto[]> {
  // //   const allClusters: ClusterDto[] = [
  // //     {
  // //       id: '1',
  // //       name: 'raspberry-k3s',
  // //       provider: 'Raspberry Pi K3s',
  // //       status: 'healthy',
  // //       nodes: 0,
  // //       pods: 0,
  // //       version: 'v1.28.3',
  // //     },
  // //     // 추후 다른 클라우드 추가 예정
  // //   ];

  //   // 실제 노드/Pod 수 업데이트
  //   const [nodes, pods] = await Promise.all([
  //     this.getNodes(),
  //     this.getAllPods(),
  //   ]);

  //   allClusters[0].nodes = nodes.length;
  //   allClusters[0].pods = pods.length;

  //   // Provider 필터링
  //   if (provider && provider !== 'all') {
  //     return allClusters.filter((c) =>
  //       c.provider.toLowerCase().includes(provider.toLowerCase()),
  //     );
  //   }

  //   return allClusters;
  // }

    // API Reqauests
private async getApiRequestMetricsForCluster(
  cluster: Cluster,
  kubeConfig: k8s.KubeConfig
): Promise<MetricDto> {
  try {
    const response = await axios.get(`${cluster.apiEndpoint}/metrics`, {
      headers: { Authorization: `Bearer ${cluster.token}` },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    });

    const metricsText = response.data;
    const totalRequests = this.parsePrometheusMetric(metricsText, 'apiserver_request_total');
    
    const previous1min = await this.metricsCollector.getPreviousMetric(
      cluster.id,
      'requests_total',
      1,
    );

    const requestRate = previous1min 
      ? totalRequests - previous1min
      : 0;

    await this.metricsCollector.saveMetric(cluster.id, 'requests_total', totalRequests);

    return {
      current: requestRate,
      trend: 0,
      status: 'healthy',
    };
  } catch (error) {
    console.error('Failed to get API requests:', error.message);
    return {
      current: 0,
      trend: 0,
      status: 'healthy',
    };
  }
}

      /**
     * Prometheus 메트릭 파싱
     */
    private parsePrometheusMetric(metricsText: string, metricName: string): number {
      const lines = metricsText.split('\n');
      let total = 0;

      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        
        if (line.startsWith(metricName)) {
          const match = line.match(/\s+(\d+)$/);
          if (match) total += parseInt(match[1]);
        }
      }

      return total;
    }

    /**
     * Pod 수 기반 API 요청 추정 (fallback)
     */
    // private async getEstimatedRequests(): Promise<MetricDto> {
    //   const pods = await this.getAllPodsForCluster(KubeConfig);
    //   const estimated = pods.length * 100; // Pod당 분당 100 요청 추정
      
    //   return {
    //     current: estimated,
    //     trend: 0,
    //     status: 'healthy',
    //   };
    // }


    /**
    * Storage Metrics 수집 (노드 디스크 사용량)
    */
private async getStorageMetricsForCluster(
  kubeConfig: k8s.KubeConfig,  // ← 추가!
  nodes: any[]
): Promise<MetricDto> {
  try {
    console.log('🔍 Getting storage metrics for', nodes.length, 'nodes');
    
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);  // ← 변경!
    const exec = new k8s.Exec(kubeConfig);  // ← 변경!
    
    const systemPods = await k8sApi.listNamespacedPod({
      namespace: 'kube-system',
    });
        
        console.log('📦 Found', systemPods.items.length, 'system pods');
        
        let totalPercent = 0;
        let nodeCount = 0;
        
        for (const node of nodes) {
          const nodeName = node.name;
          console.log('🔍 Checking node:', nodeName);
          
          if (!nodeName) continue;
          
          const nodePods = systemPods.items.filter(
            p => p.spec?.nodeName === nodeName && p.status?.phase === 'Running'
          );
          
          console.log(`📦 Found ${nodePods.length} pods for node:`, nodeName);
          
          let success = false;
          
          for (const nodePod of nodePods) {
            if (!nodePod.metadata?.name || !nodePod.spec?.containers?.[0]?.name) {
              continue;
            }
            
            try {
              console.log('🚀 Trying pod:', nodePod.metadata.name);
              
              const command = ['df', '-h', '/'];
              let output = '';
              
              const stdout = new (require('stream').Writable)({
                write(chunk: any, encoding: string, callback: Function) {
                  output += chunk.toString();
                  callback();
                }
              });

              const stderr = new (require('stream').Writable)({
                write(chunk: any, encoding: string, callback: Function) {
                  callback();
                }
              });
              
              await new Promise<void>((resolve, reject) => {
                exec.exec(
                  'kube-system',
                  nodePod.metadata!.name!,
                  nodePod.spec!.containers[0].name!,
                  command,
                  stdout,
                  stderr,
                  null,
                  false,
                  (status: k8s.V1Status) => {
                    if (status.status === 'Success') {
                      // 출력이 완전히 들어올 때까지 잠깐 대기
                      setTimeout(() => resolve(), 500);  // ← 추가
                    } else {
                      reject(new Error(status.message || 'Exec failed'));
                    }
                  }
                ).then(() => {}).catch(reject);
              });
              
              console.log('📊 Raw output:', output);
              
              const match = output.match(/(\d+)%/);
              if (match) {
                const percent = parseInt(match[1]);
                console.log('✅ Success! Parsed percent:', percent);
                totalPercent += percent;
                nodeCount++;
                success = true;
                break;
              }
            } catch (error) {
              console.log('❌ Failed with pod:', nodePod.metadata.name, error.message);
              continue;
            }
          }
          
          if (!success) {
            console.log('⚠️ No working pod found for node:', nodeName);
          }
        }
        
        const avgPercent = nodeCount > 0 ? Math.round(totalPercent / nodeCount) : 0;
        
        console.log('✅ Final result - Total:', totalPercent, 'Count:', nodeCount, 'Avg:', avgPercent);
        
    return {
      current: avgPercent,
      trend: 0,
      status: this.getStatus(avgPercent, 90, 75),
    };
  } catch (error) {
    console.error('❌ Failed to get storage metrics:', error);
    return {
      current: 0,
      trend: 0,
      status: 'healthy',
    };
  }
}

          /**
     * Error Rate 메트릭 수집
     */
private async getErrorMetricsForCluster(
  clusterId: string,  // ← 추가!
  pods: any[]
): Promise<MetricDto> {
  const totalPods = pods.length;
  
  // Pod가 없으면 에러율 0
  if (totalPods === 0) {
    return {
      current: 0,
      trend: 0,
      status: 'healthy',
    };
  }

  // 문제 있는 Pod 찾기
  const problemPods = pods.filter(pod => {
    const phase = pod.status?.phase;
    const containerStatuses = pod.status?.containerStatuses || [];
    
    // 1. Pod 자체가 실패 상태
    if (['Failed', 'Error', 'Unknown', 'Pending'].includes(phase)) {
      // Pending이 5분 이상이면 문제로 간주
      if (phase === 'Pending') {
        const startTime = new Date(pod.status?.startTime || pod.metadata?.creationTimestamp);
        const now = new Date();
        const pendingMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60;
        return pendingMinutes > 5;  // 5분 이상 Pending
      }
      return true;
    }
    
    // 2. Container 레벨 문제 체크
    const hasContainerError = containerStatuses.some((cs: any) => {
      // Waiting 상태의 문제들
      const waitingReason = cs.state?.waiting?.reason;
      if (waitingReason) {
        return [
          'CrashLoopBackOff',
          'ImagePullBackOff', 
          'ErrImagePull',
          'CreateContainerConfigError',
          'InvalidImageName',
          'CreateContainerError'
        ].includes(waitingReason);
      }
      
      // Terminated 상태의 문제들
      const terminatedReason = cs.state?.terminated?.reason;
      if (terminatedReason) {
        return [
          'Error',
          'OOMKilled',
          'DeadlineExceeded',
          'Evicted'
        ].includes(terminatedReason);
      }
      
      // 재시작 횟수가 많으면 문제
      return cs.restartCount > 5;
    });
    
    return hasContainerError;
  });

  // 에러율 계산
  const errorRate = (problemPods.length / totalPods) * 100;
  const current = Math.round(errorRate * 100) / 100;  // 소수점 2자리
  
  // 5분 전 데이터와 비교 (트렌드)
  const previous = await this.metricsCollector.getPreviousMetric(
    clusterId,  // ← 변경! 'raspberry-k3s' → clusterId
    'pod_error_rate',
    5,
  );
  
  // 디버깅용 로그
  console.log(`📊 Pod Error Metrics:`, {
    totalPods,
    problemPods: problemPods.length,
    errorRate: current,
    problems: problemPods.map(p => ({
      name: p.metadata?.name,
      phase: p.status?.phase,
      reason: p.status?.containerStatuses?.[0]?.state?.waiting?.reason
    }))
  });

  return {
    current,
    trend: previous !== null ? this.calculateTrend(current, previous) : 0,
    status: this.getErrorStatus(current),
  };
}

      /**
       * 에러율에 따른 상태 결정
       */
      private getErrorStatus(errorRate: number): 'healthy' | 'warning' | 'critical' {
        if (errorRate >= 10) return 'critical';  // 10% 이상
        if (errorRate >= 5) return 'warning';    // 5% 이상  
        return 'healthy';                        // 5% 미만
      }

 // ===== 유틸리티 메서드 =====

  /**
   * CPU 문자열을 nanocores로 변환
   * "250m" -> 250000000
   * "1" -> 1000000000
   * "1500n" -> 1500
   */
  private parseCpuToNano(cpu: string): number {
    if (!cpu) return 0;

    if (cpu.endsWith('n')) {
      const value = parseInt(cpu);
      return isNaN(value) ? 0 : value;
    }
    if (cpu.endsWith('m')) {
      const value = parseInt(cpu);
      return isNaN(value) ? 0 : value * 1000000;
    }
    const value = parseFloat(cpu);
    return isNaN(value) ? 0 : value * 1000000000;
  }

  /**
   * CPU 문자열을 cores로 변환
   * "250m" -> 0.25
   * "2" -> 2.0
   */
  private parseCpuString(cpu: string): number {
    if (!cpu) return 0;

    if (cpu.endsWith('m')) {
      const value = parseInt(cpu);
      return isNaN(value) ? 0 : value / 1000;
    }
    const value = parseFloat(cpu);
    return isNaN(value) ? 0 : value;
  }

  /**
   * Memory 문자열을 bytes로 변환
   * "1024Ki" -> 1048576
   * "1Mi" -> 1048576
   * "1Gi" -> 1073741824
   */
  private parseMemoryToBytes(memory: string): number {
    if (!memory) return 0;

    const units: Record<string, number> = {
      Ki: 1024,
      Mi: 1024 * 1024,
      Gi: 1024 * 1024 * 1024,
      Ti: 1024 * 1024 * 1024 * 1024,
    };

    for (const [unit, multiplier] of Object.entries(units)) {
      if (memory.endsWith(unit)) {
        const value = parseInt(memory);
        return isNaN(value) ? 0 : value * multiplier;
      }
    }

    // 단위 없으면 bytes로 간주
    const value = parseInt(memory);
    return isNaN(value) ? 0 : value;
  }

  private getDataPointsCount(timeRange: string): number {
    const ranges: Record<string, number> = {
      '1h': 12,
      '6h': 24,
      '12h': 48,
      '24h': 96,
      '7d': 168,
    };
    return ranges[timeRange] || 48;
  }

  private generateTimeSeries(
    base: number,
    variance: number,
    count: number,
  ): ChartDataPointDto[] {
    return Array.from({ length: count }, (_, i) => ({
      time: `${i}h`,
      value: Math.max(0, base + Math.random() * variance - variance / 2),
    }));
  }

  private calculateTrend(current: number, previous: number): number {
    // 퍼센트 값의 단순 차이로 계산
    const trend = current - previous;
    return Math.round(trend * 10) / 10;
  }

  private getStatus(
    value: number,
    criticalThreshold: number,
    warningThreshold: number,
  ): 'healthy' | 'warning' | 'critical' {
    if (value >= criticalThreshold) return 'critical';
    if (value >= warningThreshold) return 'warning';
    return 'healthy';
  }

  /**
 * 매 1분마다 메트릭 수집 및 저장
 */
  // @Cron(CronExpression.EVERY_MINUTE)
  // async collectAndSaveMetrics() {
  //   console.log('\n🔍 Collecting metrics...[START]\n');

  //   try {
  //     const [nodes, pods] = await Promise.all([
  //       this.getNodes(),
  //       this.getAllPods(),
  //     ]);

  //     // CPU 메트릭
  //     const cpuMetric = await this.getCpuMetrics(nodes);
  //     const cpuValue = cpuMetric.current;
  //     // debug code start
  //         console.log('📊 CPU Debug:', {
  //     current: cpuValue,
  //     trend: cpuMetric.trend,
  //     willSave: cpuValue >= 0 && cpuValue <= 100
  //   });
    
  //   if (cpuValue >= 0 && cpuValue <= 100) {
  //     await this.metricsCollector.saveMetric('raspberry-k3s', 'cpu', cpuValue);
  //     console.log('✅ CPU saved:', cpuValue);
  //   } else {
  //             console.warn(`⚠️ Abnormal CPU value detected: ${cpuValue}, skipping save`);
  //     }
    //debug code end

      /**
   * 모든 활성 클러스터의 메트릭 수집 (크론)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectAndSaveMetrics() {
    console.log('🔍 Collecting metrics from all clusters...[START]');

    try {
      // 모든 활성 클러스터 조회
      const clusters = await this.clusterRepository.find({
        select: ['id', 'name', 'apiEndpoint', 'token', 'provider']
      });

      console.log(`📦 Found ${clusters.length} clusters`);

      // 각 클러스터마다 메트릭 수집
      for (const cluster of clusters) {
        try {
          console.log(`🔍 Collecting metrics for: ${cluster.name}`);
          await this.collectClusterMetrics(cluster);
        } catch (error) {
          console.error(`❌ Failed to collect metrics for ${cluster.name}:`, error.message);
          // 한 클러스터 실패해도 다른 클러스터는 계속 수집
        }
      }

      console.log('✅ Metrics collection completed [END]');
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

    /**
   * 특정 클러스터의 메트릭 수집
   */
  private async collectClusterMetrics(cluster: Cluster) {
    const kubeConfig = this.createKubeConfig(cluster);
    
    const [nodes, pods] = await Promise.all([
      this.getNodesForCluster(kubeConfig),
      this.getAllPodsForCluster(kubeConfig),
    ]);

    // CPU 메트릭
    const cpuMetric = await this.getCpuMetricsForCluster(kubeConfig, nodes);
    const cpuValue = cpuMetric.current;
    
    if (cpuValue >= 0 && cpuValue <= 100) {
      await this.metricsCollector.saveMetric(cluster.id, 'cpu', cpuValue);
      console.log(`✅ CPU saved for ${cluster.name}:`, cpuValue);
    }

    // Memory 메트릭
    const memoryMetric = await this.getMemoryMetricsForCluster(kubeConfig, nodes);
    const memoryValue = memoryMetric.current;
    if (memoryValue >= 0 && memoryValue <= 100) {
      await this.metricsCollector.saveMetric(cluster.id, 'memory', memoryValue);
    }

    // Pods 메트릭
    const runningPods = pods.filter((p) => p.status?.phase === 'Running').length;
    await this.metricsCollector.saveMetric(cluster.id, 'pods', runningPods);

    // Nodes 메트릭
    const readyNodes = nodes.filter((n) => n.status === 'True').length;
    await this.metricsCollector.saveMetric(cluster.id, 'nodes', readyNodes);

    // Storage 메트릭
    const storageMetric = await this.getStorageMetricsForCluster(kubeConfig, nodes);
    await this.metricsCollector.saveMetric(cluster.id, 'storage', storageMetric.current);

    // Requests 메트릭
    const requestsMetric = await this.getApiRequestMetricsForCluster(cluster, kubeConfig);
    await this.metricsCollector.saveMetric(cluster.id, 'requests', requestsMetric.current);

    // Error Rate 메트릭
    const errorMetric = await this.getErrorMetricsForCluster(cluster.id, pods);
    await this.metricsCollector.saveMetric(cluster.id, 'pod_error_rate', errorMetric.current);
  }

    // Helper 메서드들 (kubeConfig를 파라미터로 받도록 수정)
  private async getNodesForCluster(kubeConfig: k8s.KubeConfig) {
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    const response = await k8sApi.listNode();
    return response.items.map(node => ({
      name: node.metadata?.name,
      status: node.status?.conditions?.find(c => c.type === 'Ready')?.status,
    }));
  }

  private async getAllPodsForCluster(kubeConfig: k8s.KubeConfig) {
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    const response = await k8sApi.listPodForAllNamespaces();
    return response.items;
  }

      // // Memory 메트릭
      // const memoryMetric = await this.getMemoryMetrics(nodes);
      // const memoryValue = memoryMetric.current;
      // if (memoryValue >= 0 && memoryValue <= 100) {
      //   await this.metricsCollector.saveMetric('raspberry-k3s', 'memory', memoryValue);
      // } else {
      //   console.warn(`⚠️ Abnormal Memory value detected: ${memoryValue}, skipping save`);
      // }

      // // Pods 메트릭
      // const runningPods = pods.filter((p) => p.status?.phase === 'Running').length;
      // await this.metricsCollector.saveMetric('raspberry-k3s', 'pods', runningPods);

      // // Nodes 메트릭
      // const readyNodes = nodes.filter((n) => n.status === 'True').length;
      // await this.metricsCollector.saveMetric('raspberry-k3s', 'nodes', readyNodes);

      // // Requests 메트릭
      // const requestsMetric = await this.getApiRequestMetrics();
      // await this.metricsCollector.saveMetric('raspberry-k3s', 'requests', requestsMetric.current);

      // // Storage 메트릭
      // const storageMetric = await this.getStorageMetrics(nodes);
      // await this.metricsCollector.saveMetric('raspberry-k3s', 'storage', storageMetric.current);

      // // Error Rate 메트릭
      // const errorMetric = await this.getErrorMetrics(pods);
      // await this.metricsCollector.saveMetric('raspberry-k3s', 'pod_error_rate', errorMetric.current);


      // console.log('\n✅ Metrics saved successfully [END]\n');
  //   } catch (error) {
  //     console.error('❌ Failed to collect metrics:', error);
  //     console.error('Error stack:', error.stack);
  //   }
  // }



}
