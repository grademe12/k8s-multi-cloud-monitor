// backend/src/k8s/dto/k8s-stats.dto.ts

export interface MetricDto {
  current: number;
  trend: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface MetricsDto {
  cpu?: MetricDto;
  memory?: MetricDto;
  pods?: MetricDto;
  nodes?: MetricDto;
  network?: MetricDto;
  storage?: MetricDto;
  requests?: MetricDto;
  errors?: MetricDto;
}

export interface ChartDataPointDto {
  time: string;
  value: number;
}

export interface ChartsDto {
  cpu?: ChartDataPointDto[];
  memory?: ChartDataPointDto[];
  network?: ChartDataPointDto[];
  storage?: ChartDataPointDto[];
  requests?: ChartDataPointDto[];
  errors?: ChartDataPointDto[];
}

export interface ClusterDto {
  id: string;
  name: string;
  provider: string;
  status: 'healthy' | 'warning' | 'critical';
  nodes: number;
  pods: number;
  version: string;
}

export interface K8sStatsResponseDto {
  metrics: MetricsDto;
  charts: ChartsDto;
  clusters: ClusterDto[];
}

export class GetStatsQueryDto {
  provider?: string = 'all';
  stats?: string = 'cpu,memory,pods,nodes';
  timeRange?: string = '12h';
}