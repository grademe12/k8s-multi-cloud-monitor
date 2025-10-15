import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: parseInt(configService.get('DATABASE_PORT') || '5432'),
        username: configService.get('DATABASE_USER'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [Metric, User, Cluster],
        schema: 'app',
        synchronize: configService.get('NODE_ENV') !== 'production',  // Dev만 true
        ssl: false,
      }),
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    K8sModule,  // 추가
    AuthModule,
    ClustersModule,
  ],
})
export class AppModule {}