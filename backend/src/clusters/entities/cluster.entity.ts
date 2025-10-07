import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Cluster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  provider: string;

  @Column()
  apiEndpoint: string;

  @Column()
  region: string;

  @Column({ nullable: true })
  version: string;

  @Column({ select: false })  // 조회 시 기본적으로 제외
  token: string;

  @ManyToOne(() => User, user => user.clusters)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}