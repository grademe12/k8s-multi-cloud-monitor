import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany, BeforeInsert } from 'typeorm';
import { Cluster } from '../../clusters/entities/cluster.entity';
import { randomUUID } from 'crypto';

@Entity()
export class User {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Cluster, cluster => cluster.user)
  clusters: Cluster[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}