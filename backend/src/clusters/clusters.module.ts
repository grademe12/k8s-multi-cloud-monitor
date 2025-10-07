import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClustersController } from './clusters.controller';
import { ClustersService } from './clusters.service';
import { Cluster } from './entities/cluster.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cluster])],
  controllers: [ClustersController],
  providers: [ClustersService],
  exports: [ClustersService],
})
export class ClustersModule {}