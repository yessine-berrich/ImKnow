import { DataSource } from 'typeorm';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';

export async function seedCategoriesAndTags(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);
  const tagRepository = dataSource.getRepository(Tag);

  // Vérifier si les catégories existent déjà
  const existingCategories = await categoryRepository.count();
  if (existingCategories === 0) {
    const categories = [
      {
        name: 'Développement',
        description: 'Articles liés au développement logiciel',
      },
      {
        name: 'Design',
        description: 'Articles sur le design et l\'UX/UI',
      },
      {
        name: 'Marketing',
        description: 'Stratégies marketing et communication',
      },
      {
        name: 'RH',
        description: 'Ressources humaines et gestion d\'équipe',
      },
      {
        name: 'Finance',
        description: 'Gestion financière et comptabilité',
      },
      {
        name: 'Juridique',
        description: 'Aspects juridiques et conformité',
      },
    ];

    await categoryRepository.save(categories);
    console.log('✅ Categories seeded successfully');
  }

  // Vérifier si les tags existent déjà
  const existingTags = await tagRepository.count();
  if (existingTags === 0) {
    const tags = [
      { name: '#React' },
      { name: '#TypeScript' },
      { name: '#Guide' },
      { name: '#Tutoriel' },
      { name: '#Best Practices' },
      { name: '#Nouveau' },
      { name: '#Important' },
      { name: '#Urgent' },
      { name: '#Node.js' },
      { name: '#Frontend' },
      { name: '#Backend' },
      { name: '#DevOps' },
      { name: '#Security' },
      { name: '#Performance' },
      { name: '#Testing' },
      { name: '#Architecture' },
      { name: '#Database' },
      { name: '#API' },
      { name: '#UI/UX' },
      { name: '#Mobile' },
    ];

    await tagRepository.save(tags);
    console.log('✅ Tags seeded successfully');
  }
}