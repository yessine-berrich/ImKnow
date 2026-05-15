// category.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) { }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<{ message: string; id: number }> {
    const category = await this.findOne(id);

    // Vérifier si la catégorie a des articles associés
    if (category.articles && category.articles.length > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it has ${category.articles.length} associated article(s)`
      );
    }

    await this.categoryRepository.remove(category);

    // Retourner une confirmation explicite
    return {
      message: `Category "${category.name}" successfully deleted`,
      id: category.id,
    };
  }

  async findArticlesByCategory(categoryId: number) {
    return this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['articles', 'articles.author', 'articles.tags', 'articles.media'],
    });
  }
}