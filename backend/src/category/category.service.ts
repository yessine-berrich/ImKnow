// category.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

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
    const name = this.capitalize(createCategoryDto.name.trim());
    const existing = await this.categoryRepository.findOne({ where: { name } });
    if (existing) throw new ConflictException(`La catégorie "${name}" existe déjà`);
    const category = this.categoryRepository.create({ ...createCategoryDto, name });
    return this.categoryRepository.save(category);
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);
    if (updateCategoryDto.name) {
      const name = this.capitalize(updateCategoryDto.name.trim());
      if (name !== category.name) {
        const conflict = await this.categoryRepository.findOne({ where: { name } });
        if (conflict) throw new ConflictException(`La catégorie "${name}" existe déjà`);
      }
      updateCategoryDto = { ...updateCategoryDto, name };
    }
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