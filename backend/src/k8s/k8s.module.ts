import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { K8sController } from './k8s.controller';
import { K8sService } from './k8s.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { Metric } from './entities/metric.entity';
import { Cluster } from '../clusters/entities/cluster.entity';  // ← 추가
import { EncryptionService } from '../common/encryption.service';

@Module({
  imports: [TypeOrmModule.forFeature([Metric, Cluster])],
  controllers: [K8sController],
  providers: [K8sService, MetricsCollectorService, EncryptionService],
  exports: [K8sService, MetricsCollectorService],  // MetricsCollectorService 추가
})
export class K8sModule {}