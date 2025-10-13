import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClustersController } from './clusters.controller';
import { ClustersService } from './clusters.service';
import { Cluster } from './entities/cluster.entity';
import { Metric } from '../k8s/entities/metric.entity';  // 🔥 추가

@Module({
  imports: [TypeOrmModule.forFeature([Cluster, Metric])],  // 🔥 Metric 추가
  controllers: [ClustersController],
  providers: [ClustersService],
  exports: [ClustersService],
})
export class ClustersModule {}