import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { K8sController } from './k8s.controller';
import { K8sService } from './k8s.service';
import { MetricsCollectorService } from './metrics-collector.service';
import { Metric } from './entities/metric.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Metric])],
  controllers: [K8sController],
  providers: [K8sService, MetricsCollectorService],
  exports: [K8sService],
})
export class K8sModule {}