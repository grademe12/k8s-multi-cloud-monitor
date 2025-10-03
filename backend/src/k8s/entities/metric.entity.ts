import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('metrics')
@Index(['clusterId', 'metricType', 'timestamp'])
export class Metric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clusterId: string;

  @Column()
  metricType: string; // 'cpu', 'memory', 'pods', 'nodes'

  @Column('real')
  value: number;

  @CreateDateColumn()
  timestamp: Date;
}