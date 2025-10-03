import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as k8s from '@kubernetes/client-node';
import {
  K8sStatsResponseDto,
  MetricDto,
  ChartDataPointDto,
  ClusterDto,
} from './dto/k8s-stats.dto';

@Injectable()
export class K8sService {
  private kubeConfig: k8s.KubeConfig;

  constructor(private configService: ConfigService) {
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
    const charts = await this.generateCharts(requestedStats, timeRange);

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
  private async getAllPods() {
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

    // Requests Metrics (Mock)
    if (requestedStats.includes('requests')) {
      metrics.requests = {
        current: 15234,
        trend: 3.2,
        status: 'healthy',
      };
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
      // Metrics API 사용 (올바른 방법)
      const metricsClient = new k8s.Metrics(this.kubeConfig);
      const nodeMetrics = await metricsClient.getNodeMetrics();

      // CPU 사용량 계산 (단순화)
      const totalCpu = nodeMetrics.items.reduce((sum, item) => {
        const cpuUsage = this.parseCpuString(item.usage.cpu);
        return sum + cpuUsage;
      }, 0);

      const avgCpuPercent = (totalCpu / nodes.length) * 100;

      return {
        current: Math.round(avgCpuPercent * 10) / 10,
        trend: this.calculateTrend(avgCpuPercent, avgCpuPercent - 5),
        status: this.getStatus(avgCpuPercent, 80, 60),
      };
    } catch (error) {
      console.error('Metrics Server not available, using mock data:', error);
      // Metrics Server가 없을 경우 Mock 데이터
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

      const totalMemory = nodeMetrics.items.reduce((sum, item) => {
        const memUsage = this.parseMemoryString(item.usage.memory);
        return sum + memUsage;
      }, 0);

      const avgMemPercent = (totalMemory / (nodes.length * 1024)) * 100;

      return {
        current: Math.round(avgMemPercent * 10) / 10,
        trend: this.calculateTrend(avgMemPercent, avgMemPercent - 3),
        status: this.getStatus(avgMemPercent, 85, 70),
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
   * Charts 데이터 생성
   */
  private async generateCharts(requestedStats: string[], timeRange: string) {
    const dataPoints = this.getDataPointsCount(timeRange);
    const charts: any = {};

    if (requestedStats.includes('cpu')) {
      charts.cpu = this.generateTimeSeries(65, 20, dataPoints);
    }

    if (requestedStats.includes('memory')) {
      charts.memory = this.generateTimeSeries(70, 15, dataPoints);
    }

    if (requestedStats.includes('network')) {
      charts.network = this.generateTimeSeries(500, 200, dataPoints);
    }

    if (requestedStats.includes('storage')) {
      charts.storage = this.generateTimeSeries(80, 10, dataPoints);
    }

    if (requestedStats.includes('requests')) {
      charts.requests = this.generateTimeSeries(15000, 5000, dataPoints);
    }

    if (requestedStats.includes('errors')) {
      charts.errors = this.generateTimeSeries(0.8, 0.5, dataPoints);
    }

    return charts;
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

  // ===== 유틸리티 메서드 =====

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
      value: base + Math.random() * variance - variance / 2,
    }));
  }

  private calculateTrend(current: number, previous: number): number {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
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

  private parseCpuString(cpu: string): number {
    // "250m" -> 0.25, "2" -> 2.0
    if (cpu.endsWith('m')) {
      return parseInt(cpu) / 1000;
    }
    return parseFloat(cpu);
  }

  private parseMemoryString(memory: string): number {
    // "1024Ki" -> 1, "1Mi" -> 1
    const units: Record<string, number> = {
      Ki: 1 / 1024,
      Mi: 1,
      Gi: 1024,
    };

    for (const [unit, multiplier] of Object.entries(units)) {
      if (memory.endsWith(unit)) {
        return parseInt(memory) * multiplier;
      }
    }

    return parseInt(memory);
  }
}