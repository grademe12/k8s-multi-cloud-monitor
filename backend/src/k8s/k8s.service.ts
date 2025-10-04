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

@Injectable()
export class K8sService {
  private kubeConfig: k8s.KubeConfig;

  constructor(
    private configService: ConfigService,
    private metricsCollector: MetricsCollectorService,
  ) {
    this.initializeCluster();
  }

  private initializeCluster() {
    this.kubeConfig = new k8s.KubeConfig();

    this.kubeConfig.loadFromOptions({
      clusters: [
        {
          name: 'raspberry',
          server: this.configService.get('RASPBERRY_K8S_HOST'),
          skipTLSVerify:
            this.configService.get('RASPBERRY_K8S_SKIP_TLS') === 'true',
        },
      ],
      users: [
        {
          name: 'monitor-sa',
          token: this.configService.get('RASPBERRY_K8S_TOKEN'),
        },
      ],
      contexts: [
        {
          name: 'raspberry-context',
          cluster: 'raspberry',
          user: 'monitor-sa',
        },
      ],
      currentContext: 'raspberry-context',
    });
  }

  async getNodes() {
    try {
      const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
      const response = await k8sApi.listNode();

      return response.items.map((node) => ({
        name: node.metadata?.name,
        status: node.status?.conditions?.find((c) => c.type === 'Ready')
          ?.status,
        capacity: {
          cpu: node.status?.capacity?.cpu,
          memory: node.status?.capacity?.memory,
        },
      }));
    } catch (error) {
      throw new Error(`Failed to get nodes: ${error.message}`);
    }
  }

async getPods(namespace?: string) {
  try {
    const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    
    let response;
    
    // namespace 파라미터가 없으면 모든 네임스페이스 조회
    if (!namespace || namespace === 'all') {
      response = await k8sApi.listPodForAllNamespaces();
    } else {
      response = await k8sApi.listNamespacedPod({
        namespace: namespace,
      });
    }
    
    return response.items.map(pod => ({
      name: pod.metadata?.name,
      namespace: pod.metadata?.namespace,
      status: pod.status?.phase,
      nodeName: pod.spec?.nodeName,
    }));
  } catch (error) {
    throw new Error(`Failed to get pods: ${error.message}`);
  }
}

  /**
   * 클러스터 통계 수집
   */
  async getClusterStats(
    provider: string,
    statsParam: string,
    timeRange: string,
  ): Promise<K8sStatsResponseDto> {
    const requestedStats = statsParam.split(',');

    // 실제 클러스터 데이터 수집
    const [nodes, allPods] = await Promise.all([
      this.getNodes(),
      this.getAllPods(),
    ]);

    // Metrics 계산
    const metrics = await this.calculateMetrics(
      requestedStats,
      nodes,
      allPods,
    );

    // Charts 데이터 생성
    const charts = await this.generateCharts(requestedStats, timeRange, metrics);

    // Clusters 정보
    const clusters = await this.getClustersInfo(provider);

    return {
      metrics,
      charts,
      clusters,
    };
  }

  /**
   * 모든 네임스페이스의 Pod 조회
   */
  public async getAllPods() {
    try {
      const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
      const response = await k8sApi.listPodForAllNamespaces();
      return response.items;
    } catch (error) {
      console.error('Failed to get all pods:', error);
      return [];
    }
  }

  /**
   * Metrics 계산
   */
  private async calculateMetrics(
    requestedStats: string[],
    nodes: any[],
    pods: any[],
  ) {
    const metrics: any = {};

    // CPU Metrics
    if (requestedStats.includes('cpu')) {
      const cpuMetrics = await this.getCpuMetrics(nodes);
      metrics.cpu = cpuMetrics;
    }

    // Memory Metrics
    if (requestedStats.includes('memory')) {
      const memoryMetrics = await this.getMemoryMetrics(nodes);
      metrics.memory = memoryMetrics;
    }

    // Pods Metrics
    if (requestedStats.includes('pods')) {
      const runningPods = pods.filter((p) => p.status?.phase === 'Running');
      metrics.pods = {
        current: runningPods.length,
        trend: this.calculateTrend(runningPods.length, runningPods.length - 5),
        status: this.getStatus(runningPods.length, 200, 150),
      };
    }

    // Nodes Metrics
    if (requestedStats.includes('nodes')) {
      const readyNodes = nodes.filter((n) => n.status === 'True');
      metrics.nodes = {
        current: readyNodes.length,
        trend: 0,
        status: readyNodes.length === nodes.length ? 'healthy' : 'warning',
      };
    }

    // Network Metrics (Mock - K8s에서 직접 수집 어려움)
    if (requestedStats.includes('network')) {
      metrics.network = {
        current: 523,
        trend: 2.5,
        status: 'healthy',
      };
    }

    // Storage Metrics
    if (requestedStats.includes('storage')) {
      metrics.storage = {
        current: 78.5,
        trend: 1.2,
        status: 'warning',
      };
    }

    // Requests Metrics
      if (requestedStats.includes('requests')) {
        const requestsMetric = await this.getApiRequestMetrics();
        metrics.requests = requestsMetric;
      }

    // Errors Metrics (Mock)
    if (requestedStats.includes('errors')) {
      metrics.errors = {
        current: 0.8,
        trend: -0.3,
        status: 'healthy',
      };
    }

    return metrics;
  }

  /**
   * CPU Metrics 수집 (K8s Metrics Server 필요)
   */
    private async getCpuMetrics(nodes: any[]): Promise<MetricDto> {
      try {
        const metricsClient = new k8s.Metrics(this.kubeConfig);
        const nodeMetrics = await metricsClient.getNodeMetrics();

        const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
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

        // 5분 전 데이터 조회
        const previous = await this.metricsCollector.getPreviousMetric(
          'raspberry-k3s',
          'cpu',
          5,
        );

        return {
          current,
          trend: this.calculateTrend(current, previous || current),
          status: this.getStatus(current, 80, 60),
        };
      } catch (error) {
        console.error('Metrics Server not available, using mock data:', error);
        return {
          current: 65.4,
          trend: 2.3,
          status: 'healthy',
        };
      }
    }

  /**
   * Memory Metrics 수집
   */
    private async getMemoryMetrics(nodes: any[]): Promise<MetricDto> {
      try {
        const metricsClient = new k8s.Metrics(this.kubeConfig);
        const nodeMetrics = await metricsClient.getNodeMetrics();

        const k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
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

        // 5분 전 데이터 조회
        const previous = await this.metricsCollector.getPreviousMetric(
          'raspberry-k3s',
          'memory',
          5,
        );

        return {
          current,
          trend: this.calculateTrend(current, previous || current),
          status: this.getStatus(current, 85, 70),
        };
      } catch (error) {
        console.error('Metrics Server not available, using mock data:', error);
        return {
          current: 72.8,
          trend: -1.5,
          status: 'warning',
        };
      }
    }

  /**
 * Charts 데이터 생성 - DB에서 실제 데이터 조회
 */
private async generateCharts(
  requestedStats: string[],
  timeRange: string,
  metrics: any,
) {
  const charts: any = {};

  // CPU 차트
  if (requestedStats.includes('cpu')) {
    const cpuData = await this.metricsCollector.getMetrics(
      'raspberry-k3s',
      'cpu',
      timeRange,
    );
    charts.cpu = this.formatChartData(cpuData);
  }

  // Memory 차트
  if (requestedStats.includes('memory')) {
    const memoryData = await this.metricsCollector.getMetrics(
      'raspberry-k3s',
      'memory',
      timeRange,
    );
    charts.memory = this.formatChartData(memoryData);
  }

  // Pods 차트
  if (requestedStats.includes('pods')) {
    const podsData = await this.metricsCollector.getMetrics(
      'raspberry-k3s',
      'pods',
      timeRange,
    );
    charts.pods = this.formatChartData(podsData);
  }

  // Nodes 차트
  if (requestedStats.includes('nodes')) {
    const nodesData = await this.metricsCollector.getMetrics(
      'raspberry-k3s',
      'nodes',
      timeRange,
    );
    charts.nodes = this.formatChartData(nodesData);
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

  /**
   * Clusters 정보 조회
   */
  private async getClustersInfo(provider: string): Promise<ClusterDto[]> {
    const allClusters: ClusterDto[] = [
      {
        id: '1',
        name: 'raspberry-k3s',
        provider: 'Raspberry Pi K3s',
        status: 'healthy',
        nodes: 0,
        pods: 0,
        version: 'v1.28.3',
      },
      // 추후 다른 클라우드 추가 예정
    ];

    // 실제 노드/Pod 수 업데이트
    const [nodes, pods] = await Promise.all([
      this.getNodes(),
      this.getAllPods(),
    ]);

    allClusters[0].nodes = nodes.length;
    allClusters[0].pods = pods.length;

    // Provider 필터링
    if (provider && provider !== 'all') {
      return allClusters.filter((c) =>
        c.provider.toLowerCase().includes(provider.toLowerCase()),
      );
    }

    return allClusters;
  }

      /**
     * API Requests 메트릭 수집
     */
    private async getApiRequestMetrics(): Promise<MetricDto> {
      try {
        const host = this.configService.get('RASPBERRY_K8S_HOST');
        const token = this.configService.get('RASPBERRY_K8S_TOKEN');
        
        // K8s API Server /metrics 엔드포인트 호출
        const response = await fetch(`${host}/metrics`, {
          headers: { Authorization: `Bearer ${token}` },
          // @ts-ignore
          rejectUnauthorized: false,
        });

        if (!response.ok) {
          return this.getEstimatedRequests();
        }

        const metricsText = await response.text();
        const totalRequests = this.parsePrometheusMetric(metricsText, 'apiserver_request_total');
        
        // 5분 전 데이터와 비교
        const previous = await this.metricsCollector.getPreviousMetric(
          'raspberry-k3s',
          'requests',
          5,
        );

        return {
          current: totalRequests,
          trend: this.calculateTrend(totalRequests, previous || totalRequests),
          status: 'healthy',
        };
      } catch (error) {
        console.error('Failed to get API requests:', error.message);
        return this.getEstimatedRequests();
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
     * Pod 수 기반 API 요청 추정
     */
    private async getEstimatedRequests(): Promise<MetricDto> {
      const pods = await this.getAllPods();
      const estimated = pods.length * 100; // Pod당 분당 100 요청 추정
      
      return {
        current: estimated,
        trend: 0,
        status: 'healthy',
      };
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
  @Cron(CronExpression.EVERY_MINUTE)
  async collectAndSaveMetrics() {
    console.log('🔍 Collecting metrics...');

    try {
      const [nodes, pods] = await Promise.all([
        this.getNodes(),
        this.getAllPods(),
      ]);

      // CPU 메트릭
      const cpuMetric = await this.getCpuMetrics(nodes);
      await this.metricsCollector.saveMetric('raspberry-k3s', 'cpu', cpuMetric.current);

      // Memory 메트릭
      const memoryMetric = await this.getMemoryMetrics(nodes);
      await this.metricsCollector.saveMetric('raspberry-k3s', 'memory', memoryMetric.current);

      // Pods 메트릭
      const runningPods = pods.filter((p) => p.status?.phase === 'Running').length;
      await this.metricsCollector.saveMetric('raspberry-k3s', 'pods', runningPods);

      // Nodes 메트릭
      const readyNodes = nodes.filter((n) => n.status === 'True').length;
      await this.metricsCollector.saveMetric('raspberry-k3s', 'nodes', readyNodes);

      // Requests 메트릭
      const requestsMetric = await this.getApiRequestMetrics();
      await this.metricsCollector.saveMetric('raspberry-k3s', 'requests', requestsMetric.current);

      console.log('✅ Metrics saved successfully');
    } catch (error) {
      console.error('❌ Failed to collect metrics:', error);
    }
  }

}
