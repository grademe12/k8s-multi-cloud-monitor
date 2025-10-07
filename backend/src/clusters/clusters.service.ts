import { Injectable, NotFoundException } from '@nestjs/common';
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
    const cluster = this.clusterRepository.create(data);
    await this.clusterRepository.save(cluster);
    
    // token 제외하고 반환
    const { token, ...result } = cluster;
    return result;
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