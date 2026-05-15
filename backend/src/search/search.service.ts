import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Article } from '../article/entities/article.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { ArticleStatus } from 'utils/constants';
import type {
  GlobalSearchResult,
  ArticleSearchResult,
  CategorySearchResult,
  TagSearchResult,
  UserSearchResult,
} from './interfaces/search-result.interface';

@Injectable()
export class SearchService {
  private readonly ollamaHost = 'http://localhost:11434';
  private readonly embedModel = 'nomic-embed-text';

  constructor(
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly httpService: HttpService,
  ) {}

  async globalSearch(
    query: string,
    limitPerType = 5,
    minSimilarity = 0.65,
  ): Promise<GlobalSearchResult> {
    const searchTerm = query.trim();

    const [articles, categories, tags, users] = await Promise.all([
      this.searchArticlesSemantic(searchTerm, limitPerType, minSimilarity),
      this.searchCategories(searchTerm, limitPerType),
      this.searchTags(searchTerm, limitPerType),
      this.searchUsers(searchTerm, limitPerType),
    ]);

    const totalResults = articles.length + categories.length + tags.length + users.length;

    return {
      query: searchTerm,
      articles,
      categories,
      tags,
      users,
      totalResults,
    };
  }

  private async searchArticlesSemantic(
    query: string,
    limit: number,
    minSimilarity: number = 0.65,
  ): Promise<ArticleSearchResult[]> {
    try {
      // Generate embedding for the search query
      const queryVector = await this.generateEmbedding(query);

      if (queryVector && queryVector.length === 768) {
        // Format vector for pgvector: '[val1, val2, ...]'
        const vectorString =
          '[' + queryVector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

        // Semantic search using pgvector cosine similarity
        const results = await this.articleRepository.query(
          `
          SELECT 
            a.id,
            a.title,
            a.content,
            a."viewsCount",
            a."createdAt",
            ROUND(CAST((1 - (a.embedding_vector_pg <=> $1::vector)) AS numeric), 4) AS similarity,
            json_build_object(
              'id', u.id,
              'firstName', u."firstName",
              'lastName', u."lastName",
              'profileImage', u."profileImage"
            ) AS author,
            json_build_object(
              'id', c.id,
              'name', c.name
            ) AS category,
            COALESCE(
              (
                SELECT json_agg(json_build_object('id', t.id, 'name', t.name))
                FROM article_tags at
                JOIN tags t ON t.id = at."tagsId"
                WHERE at."articlesId" = a.id
              ),
              '[]'::json
            ) AS tags,
            COALESCE(
              (
                SELECT json_agg(json_build_object(
                  'id', m.id,
                  'url', m.url,
                  'filename', m.filename,
                  'mimetype', m.mimetype,
                  'type', m.type,
                  'size', m.size
                ))
                FROM media m
                WHERE m."articleId" = a.id
              ),
              '[]'::json
            ) AS media,
            (
              SELECT COUNT(*)::int
              FROM article_likes al
              WHERE al."articlesId" = a.id
            ) AS "likesCount"
          FROM articles a
          LEFT JOIN users u ON u.id = a."authorId"
          LEFT JOIN categories c ON c.id = a."categoryId"
          WHERE a.embedding_vector_pg IS NOT NULL
            AND a.status = $2
            AND (1 - (a.embedding_vector_pg <=> $1::vector)) >= $3
          ORDER BY similarity DESC
          LIMIT $4
          `,
          [vectorString, ArticleStatus.PUBLISHED, minSimilarity, limit],
        );

        if (results && results.length > 0) {
          return results.map((row) => ({
            id: row.id,
            title: row.title,
            contentPreview:
              row.content?.length > 200
                ? row.content.substring(0, 200) + '...'
                : row.content || '',
            author: row.author,
            category: row.category,
            tags: row.tags || [],
            media: row.media || [],
            viewsCount: row.viewsCount,
            likesCount: row.likesCount || 0,
            similarity: Number(row.similarity),
            createdAt: row.createdAt,
          }));
        }
      }
    } catch (error: any) {
      console.error('[SEARCH] Semantic search failed, falling back to text search:', error.message);
    }

    // Fallback to text-based search if semantic search fails or returns no results
    return this.searchArticlesText(query, limit);
  }

  private async searchArticlesText(
    query: string,
    limit: number,
  ): Promise<ArticleSearchResult[]> {
    const searchPattern = `%${query}%`;
    const articles = await this.articleRepository.find({
      where: [
        { title: ILike(searchPattern), status: ArticleStatus.PUBLISHED },
        { content: ILike(searchPattern), status: ArticleStatus.PUBLISHED },
      ],
      relations: ['author', 'category', 'tags', 'likes', 'media'],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      contentPreview:
        article.content.length > 200
          ? article.content.substring(0, 200) + '...'
          : article.content,
      author: {
        id: article.author.id,
        firstName: article.author.firstName,
        lastName: article.author.lastName,
        profileImage: article.author.profileImage || null,
      },
      category: article.category
        ? {
            id: article.category.id,
            name: article.category.name,
          }
        : null,
      tags: article.tags?.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })) || [],
      media: article.media?.map((m) => ({
        id: m.id,
        url: m.url,
        filename: m.filename,
        mimetype: m.mimetype,
        type: m.type,
        size: m.size,
      })) || [],
      viewsCount: article.viewsCount,
      likesCount: article.likes?.length || 0,
      createdAt: article.createdAt,
    }));
  }

  private async searchCategories(
    query: string,
    limit: number,
  ): Promise<CategorySearchResult[]> {
    const searchPattern = `%${query}%`;
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.articles', 'article')
      .where(
        '(LOWER(category.name) LIKE LOWER(:pattern) OR LOWER(category.description) LIKE LOWER(:pattern))',
        { pattern: searchPattern },
      )
      .getMany();

    // Sort by articles count and limit
    const sortedCategories = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        articlesCount: category.articles?.length || 0,
      }))
      .sort((a, b) => b.articlesCount - a.articlesCount)
      .slice(0, limit);

    return sortedCategories;
  }

  private async searchTags(
    query: string,
    limit: number,
  ): Promise<TagSearchResult[]> {
    const searchPattern = `%${query}%`;
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .leftJoinAndSelect('tag.articles', 'article')
      .where('LOWER(tag.name) LIKE LOWER(:pattern)', { pattern: searchPattern })
      .getMany();

    // Sort by articles count and limit
    const sortedTags = tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        articlesCount: tag.articles?.length || 0,
      }))
      .sort((a, b) => b.articlesCount - a.articlesCount)
      .slice(0, limit);

    return sortedTags;
  }

  private async searchUsers(
    query: string,
    limit: number,
  ): Promise<UserSearchResult[]> {
    const searchPattern = `%${query}%`;
    const users = await this.userRepository.find({
      where: [
        { firstName: ILike(searchPattern) },
        { lastName: ILike(searchPattern) },
        { email: ILike(searchPattern) },
        { bio: ILike(searchPattern) },
        { department: ILike(searchPattern) },
      ],
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: user.profileImage || null,
      bio: user.bio || null,
      department: user.department || null,
      country: user.country || null,
    }));
  }

  async searchArticlesOnly(
    query: string,
    limit = 10,
    minSimilarity = 0.65,
  ): Promise<ArticleSearchResult[]> {
    return this.searchArticlesSemantic(query.trim(), limit, minSimilarity);
  }

  async searchCategoriesOnly(query: string, limit = 10): Promise<CategorySearchResult[]> {
    return this.searchCategories(query.trim(), limit);
  }

  async searchTagsOnly(query: string, limit = 10): Promise<TagSearchResult[]> {
    return this.searchTags(query.trim(), limit);
  }

  async searchUsersOnly(query: string, limit = 10): Promise<UserSearchResult[]> {
    return this.searchUsers(query.trim(), limit);
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    if (!text?.trim()) return null;

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.ollamaHost}/api/embed`, {
          model: this.embedModel,
          input: text,
        }),
      );

      const embedding = response.data.embeddings?.[0];

      if (!Array.isArray(embedding) || embedding.length !== 768) {
        throw new Error(`Invalid dimension: ${embedding?.length ?? 'null'}`);
      }

      return embedding;
    } catch (error: any) {
      console.error('Ollama embedding error:', error.message);
      return null;
    }
  }

  async semanticSearch(
    query: string,
    limit = 10,
    minSimilarity = 0.72,
    status: ArticleStatus = ArticleStatus.PUBLISHED,
  ): Promise<
    {
      id: number;
      title: string;
      content_preview: string;
      similarity: number;
    }[]
  > {
    if (!query?.trim()) return [];

    const queryVector = await this.generateEmbedding(query.trim());

    if (!queryVector?.length) {
      console.warn('Failed to generate vector for query');
      return [];
    }

    const results = await this.articleRepository.query(
      `
      SELECT
        id,
        title,
        LEFT(content, 280) AS content_preview,
        ROUND(CAST((1 - (embedding_vector <=> $1)) AS numeric), 4) AS similarity
      FROM articles
      WHERE embedding_vector IS NOT NULL
        AND status = $2
        AND (embedding_vector <=> $1) <= (1 - $3)
      ORDER BY similarity DESC
      LIMIT $4
      `,
      [queryVector, status, minSimilarity, limit],
    );

    return results;
  }
}
