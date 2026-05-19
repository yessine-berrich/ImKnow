// backend/src/media/entities/media.entity.ts

import { Publication } from 'src/publication/entities/publication.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  url: string;

  @Column()
  filename: string;

  @Column()
  mimetype: string;

  @Column({
    type: 'enum',
    enum: MediaType,
    default: MediaType.OTHER,
  })
  type: MediaType;

  @Column({ nullable: true, type: 'bigint' }) // Ajout de la colonne size
  size: number;

  @Column({ nullable: true })
  publicationId: number;

  @ManyToOne(() => Publication, (publication) => publication.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'publicationId' })
  publication: Publication;
}