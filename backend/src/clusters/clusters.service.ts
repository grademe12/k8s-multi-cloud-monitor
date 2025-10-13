import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cluster } from './entities/cluster.entity';
import { Metric } from '../k8s/entities/metric.entity';

@Injectable()
export class ClustersService {
  constructor(
    @InjectRepository(Cluster)
    private clusterRepository: Repository<Cluster>,
    @InjectRepository(Metric)
    private metricRepository: Repository<Metric>,
  ) {}

  async create(data: {
    name: string;
    provider: string;
    apiEndpoint: string;
    region: string;
    version?: string;
    token: string;
    userId: string;
  }) {
    if (data.token.toLowerCase().startsWith('bearer ')) {
      data.token = data.token.substring(7);
    }
    
    const cluster = this.clusterRepository.create(data);
    
    try {
      await this.testClusterConnection(cluster);
    } catch (error) {
      throw new BadRequestException(`클러스터 연결 실패: ${error.message}`);
    }
    
    await this.clusterRepository.save(cluster);
    
    const { token, ...result } = cluster;
    return result;
  }

  private async testClusterConnection(cluster: Cluster): Promise<void> {
    const k8s = require('@kubernetes/client-node');
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
    
    const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    await k8sApi.listNamespace();
  }

  async findByUserId(userId: string) {
    return this.clusterRepository.find({
      where: { userId },
      select: ['id', 'name', 'provider', 'apiEndpoint', 'region', 'version', 'createdAt'],
    });
  }

  async findOne(id: string, userId: string) {
    const cluster = await this.clusterRepository.findOne({
      where: { id, userId },
    });
    
    if (!cluster) {
      throw new NotFoundException('Cluster not found');
    }
    
    return cluster;
  }

  async update(id: string, userId: string, data: Partial<Cluster>) {
    const cluster = await this.findOne(id, userId);
    Object.assign(cluster, data);
    await this.clusterRepository.save(cluster);
    
    const { token, ...result } = cluster;
    return result;
  }

  // 🔥 메트릭도 함께 삭제하도록 수정
  async remove(id: string, userId: string) {
    const cluster = await this.findOne(id, userId);
    
    // 1. 해당 클러스터의 메트릭 먼저 삭제
    await this.metricRepository.delete({ clusterId: id });
    console.log(`✅ Deleted all metrics for cluster: ${id}`);
    
    // 2. 클러스터 삭제
    await this.clusterRepository.remove(cluster);
    console.log(`✅ Deleted cluster: ${id}`);
    
    return { message: 'Cluster and its metrics deleted successfully' };
  }
}