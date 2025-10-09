import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cluster } from './entities/cluster.entity';

@Injectable()
export class ClustersService {
  constructor(
    @InjectRepository(Cluster)
    private clusterRepository: Repository<Cluster>,
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
  // 1. Bearer 제거 (추가)
  if (data.token.toLowerCase().startsWith('bearer ')) {
    data.token = data.token.substring(7);
  }
  
  const cluster = this.clusterRepository.create(data);
  
  // 2. 연결 테스트 (추가)
  try {
    await this.testClusterConnection(cluster);
  } catch (error) {
    throw new BadRequestException(`클러스터 연결 실패: ${error.message}`);
  }
  
  // 3. 연결 성공 시에만 저장
  await this.clusterRepository.save(cluster);
  
  // token 제외하고 반환 (원래 있던 기능)
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
      token: cluster.token, // Bearer 없이
    }],
    contexts: [{
      name: `${cluster.name}-context`,
      cluster: cluster.name,
      user: `${cluster.name}-user`,
    }],
    currentContext: `${cluster.name}-context`,
  });
  
  const k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
  
  // 간단한 API 호출로 연결 테스트
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

  async remove(id: string, userId: string) {
    const cluster = await this.findOne(id, userId);
    await this.clusterRepository.remove(cluster);
    return { message: 'Cluster deleted successfully' };
  }
}