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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || './metrics.db',
      entities: [Metric],
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    K8sModule,  // 추가
  ],
})
export class AppModule {}