import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { Ollama } from 'ollama';

@Injectable()
export class TagService {
  private readonly ollama: Ollama;

  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
  ) {
    this.ollama = new Ollama({ host: 'http://localhost:11434' });
  }

  async findAll(): Promise<Tag[]> {
    return this.tagRepository.find({
      relations: ['articles'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Tag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['articles'],
    });
    if (!tag) throw new NotFoundException(`Tag with ID ${id} not found`);
    return tag;
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const tag = this.tagRepository.create(createTagDto);
    return this.tagRepository.save(tag);
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);
    Object.assign(tag, updateTagDto);
    return this.tagRepository.save(tag);
  }

  async remove(id: number): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }

  async findByIds(ids: number[]): Promise<Tag[]> {
    return this.tagRepository.findByIds(ids);
  }

  /**
   * Suggest relevant tags for an article using Ollama AI (local, free).
   * Returns a mix of existing tags (with their IDs) and new tag suggestions.
   */
  async suggestTags(
    title: string,
    content: string,
  ): Promise<{
    existingTags: { id: number; name: string }[];
    newSuggestions: string[];
  }> {
    // Load all existing tags for context
    const allTags = await this.tagRepository.find({ order: { name: 'ASC' } });
    const existingTagNames = allTags.map((t) => t.name);

    // Truncate content to avoid token overload
    const truncatedContent = content
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 1500);

    const prompt = `You are a tagging assistant for a knowledge-sharing platform.

Article title: "${title}"

Article content (excerpt):
${truncatedContent}

Existing tags on the platform:
${existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none yet)'}

Your task:
1. Suggest 3 to 6 highly relevant tags for this article.
2. Prefer existing tags when they fit well.
3. If no existing tag fits a concept, suggest a short new tag (1-3 words, lowercase, no special chars).
4. Return ONLY a valid JSON object, no explanation, no markdown, no code block.

Format:
{
  "existing": ["tag1", "tag2"],
  "new": ["new-tag1", "new-tag2"]
}

Rules:
- "existing" must only contain tags from the provided existing tags list (exact match).
- "new" contains tags that are NOT in the existing list.
- Total tags (existing + new) must be between 3 and 6.
- Tags must be short, specific, and relevant to the article content.

Example response:
{
  "existing": ["javascript", "nestjs"],
  "new": ["api-design"]
}`;

    try {
      // Check if Ollama is running
      await this.checkOllamaConnection();

      const response = await this.ollama.generate({
        model: 'llama3.2:3b', // You can change this to any model you pulled
        prompt: prompt,
        format: 'json', // Forces JSON output
        options: {
          temperature: 0.3, // Lower = more consistent, higher = more creative
          num_predict: 300, // Max tokens to generate
        },
      });

      // Parse the JSON response
      let parsed: { existing: string[]; new: string[] };
      
      try {
        parsed = JSON.parse(response.response);
      } catch (parseError) {
        console.error('Failed to parse Ollama response:', response.response);
        // Attempt to extract JSON from response if wrapped in markdown
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw parseError;
        }
      }

      // Match existing tag names back to their full objects (id + name)
      const existingTagNames_set = new Set(
        (parsed.existing || []).map((n) => n.toLowerCase()),
      );
      const matchedExisting = allTags.filter((t) =>
        existingTagNames_set.has(t.name.toLowerCase()),
      );

      // Sanitize new suggestions
      const newSuggestions = (parsed.new || [])
        .map((s) =>
          String(s)
            .toLowerCase()
            .replace(/[^a-z0-9\u00C0-\u017E\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim(),
        )
        .filter((s) => s.length > 0 && s.length <= 50);

      // Ensure we have at least some tags
      if (matchedExisting.length === 0 && newSuggestions.length === 0) {
        // Fallback: generate a simple tag from the title
        const fallbackTag = title
          .toLowerCase()
          .split(' ')
          .slice(0, 3)
          .join('-')
          .replace(/[^a-z0-9-]/g, '');
        
        return {
          existingTags: [],
          newSuggestions: fallbackTag ? [fallbackTag] : ['uncategorized'],
        };
      }

      return {
        existingTags: matchedExisting.map((t) => ({ id: t.id, name: t.name })),
        newSuggestions,
      };
    } catch (error) {
      console.error('Error calling Ollama:', error);
      
      // Return a simple fallback based on title keywords
      const fallbackTags = title
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
        .map(word => word.replace(/[^a-z0-9]/g, '-'));
      
      return {
        existingTags: [],
        newSuggestions: fallbackTags.length > 0 ? fallbackTags : ['general'],
      };
    }
  }

  /**
   * Check if Ollama is running and accessible
   */
  private async checkOllamaConnection(): Promise<void> {
    try {
      // Try to list models as a connection test
      await this.ollama.list();
    } catch (error) {
      throw new Error(
        'Ollama is not running. Please start Ollama first using "ollama serve" or launch the Ollama application.',
      );
    }
  }
}