// backend/src/clusters/clusters.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cluster } from './entities/cluster.entity';
import { EncryptionService } from '../common/encryption.service';

@Injectable()
export class ClustersService {
  constructor(
    @InjectRepository(Cluster)
    private clusterRepository: Repository<Cluster>,
    private encryptionService: EncryptionService,  // ← 추가
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
    // 1. Bearer 제거
    if (data.token.toLowerCase().startsWith('bearer ')) {
      data.token = data.token.substring(7);
    }
    
    // 2. 연결 테스트 (암호화 전 원본 토큰으로)
    try {
      await this.testClusterConnection({
        ...data,
        token: data.token,
      } as Cluster);
    } catch (error) {
      throw new BadRequestException(`클러스터 연결 실패: ${error.message}`);
    }
    
    // 3. 토큰 암호화 ← 새로 추가
    const encryptedToken = this.encryptionService.encrypt(data.token);
    
    // 4. 암호화된 토큰으로 저장
    const cluster = this.clusterRepository.create({
      ...data,
      token: encryptedToken,
    });
    
    await this.clusterRepository.save(cluster);
    
    // token 제외하고 반환
    const { token, ...result } = cluster;
    return result;
  }

  /**
   * 복호화된 토큰 가져오기 (내부 사용용)
   */
  async getDecryptedToken(clusterId: string, userId: string): Promise<string> {
    const cluster = await this.findOne(clusterId, userId);
    return this.encryptionService.decrypt(cluster.token);
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
        token: cluster.token, // 평문 토큰 사용
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
    
    // 토큰 업데이트 시 암호화
    if (data.token) {
      if (data.token.toLowerCase().startsWith('bearer ')) {
        data.token = data.token.substring(7);
      }
      data.token = this.encryptionService.encrypt(data.token);
    }
    
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