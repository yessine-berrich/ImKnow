import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  Column,
} from 'typeorm';
import { Publication } from './publication.entity';
import { User } from '../../users/entities/user.entity';

@Entity('publication_views')
@Index(['publication', 'user'], { unique: true }) // Optionnel : 1 seule vue comptabilisée par utilisateur
export class PublicationView {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Publication, (publication) => publication.id, { onDelete: 'CASCADE' })
  publication: Publication;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User; // Nullable si tu autorises les vues par des invités

  @Column({ nullable: true })
  ipAddress: string; // Pour limiter la triche sans compte utilisateur

  @CreateDateColumn()
  createdAt: Date;
}
