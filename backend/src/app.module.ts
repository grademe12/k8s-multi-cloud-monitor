import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { K8sService } from './k8s/k8s.service';
import { K8sController } from './k8s/k8s.controller';
import { Metric } from './k8s/entities/metric.entity';
import { K8sModule } from './k8s/k8s.module';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { Cluster } from './clusters/entities/cluster.entity';
import { ClustersModule } from './clusters/clusters.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || './metrics.db',
      entities: [Metric, User, Cluster],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    K8sModule,  // 추가
    AuthModule,
    ClustersModule,
  ],
})
export class AppModule {}