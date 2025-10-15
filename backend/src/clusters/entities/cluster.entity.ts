import { Entity, PrimaryColumn, Column, ManyToOne, CreateDateColumn, BeforeInsert } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { randomUUID } from 'crypto';

@Entity()
export class Cluster {
  @PrimaryColumn('uuid')
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

  @Column({ select: false })
  token: string;

  @ManyToOne(() => User, user => user.clusters)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}