import { Article } from "src/article/entities/article.entity";
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToMany(() => Article, (article) => article.tags)
  articles: Article[];
}