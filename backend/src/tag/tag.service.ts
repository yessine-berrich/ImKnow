import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async findAll(): Promise<{ id: number; name: string; count: number }[]> {
    const tags = await this.tagRepository
      .createQueryBuilder('tag')
      .loadRelationCountAndMap('tag.count', 'tag.articles')
      .orderBy('tag.name', 'ASC')
      .getMany();

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      count: (t as any).count ?? 0,
    }));
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
    const name = this.capitalize(createTagDto.name.trim());
    const existing = await this.tagRepository.findOne({ where: { name } });
    if (existing) throw new ConflictException(`Le tag "${name}" existe déjà`);
    const tag = this.tagRepository.create({ ...createTagDto, name });
    return this.tagRepository.save(tag);
  }

  async update(id: number, updateTagDto: UpdateTagDto): Promise<Tag> {
    const tag = await this.findOne(id);
    if (updateTagDto.name) {
      const name = this.capitalize(updateTagDto.name.trim());
      if (name !== tag.name) {
        const conflict = await this.tagRepository.findOne({ where: { name } });
        if (conflict) throw new ConflictException(`Le tag "${name}" existe déjà`);
      }
      updateTagDto = { ...updateTagDto, name };
    }
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
   * Strip markdown syntax from content so the LLM receives plain prose.
   */
  private stripMarkdown(text: string): string {
    return text
      .replace(/!\[.*?\]\(.*?\)/g, '')          // images
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // links → keep label
      .replace(/```[\s\S]*?```/g, '')            // fenced code blocks
      .replace(/`[^`]+`/g, '')                   // inline code
      .replace(/#{1,6}\s/g, '')                  // headings
      .replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2') // bold / italic
      .replace(/^[-*+]\s+/gm, '')               // list bullets
      .replace(/^\d+\.\s+/gm, '')               // numbered lists
      .replace(/^>\s+/gm, '')                   // blockquotes
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Suggest relevant tags for an article using Ollama AI.
   * Returns existing tags (with IDs) + new tag name suggestions.
   */
  async suggestTags(
    title: string,
    content: string = '',
  ): Promise<{
    existingTags: { id: number; name: string }[];
    newSuggestions: string[];
  }> {
    const allTags = await this.tagRepository.find({ order: { name: 'ASC' } });
    const existingTagNames = allTags.map((t) => t.name);

    const plainContent = this.stripMarkdown(content).substring(0, 1500);

    // Detect language hint from title (heuristic: French characters present)
    const looksLikeFrench = /[àâäéèêëîïôùûüçœæ]/i.test(title + content);
    const langHint = looksLikeFrench
      ? 'The article is in French. Suggest tags in French when appropriate.'
      : 'Suggest tags in the same language as the article.';

    const prompt = `You are a precise tagging assistant for a technical knowledge-sharing platform.

${langHint}

Article title: "${title}"
${plainContent ? `\nArticle content (excerpt):\n${plainContent}\n` : ''}
Available tags on the platform (use their exact spelling when matching):
${existingTagNames.length > 0 ? existingTagNames.join(', ') : '(none yet)'}

Instructions:
1. Suggest between 3 and 6 relevant tags total.
2. PREFER tags from the available list when they match well — copy them exactly as written.
3. For concepts not covered by existing tags, suggest new tags of MAXIMUM 3 words (lowercase, hyphens instead of spaces, no special characters).
4. Respond with ONLY a valid JSON object — no explanation, no markdown fences.

Response format:
{
  "existing": ["ExactTagNameFromList"],
  "new": ["new-concept", "another-tag"]
}

Rules:
- "existing" values must exactly match strings from the available tags list (case-sensitive).
- "new" values must NOT appear in the available tags list.
- Total of existing + new must be 3–6.`;

    try {
      await this.checkOllamaConnection();

      const response = await this.ollama.generate({
        model: 'llama3.2:3b',
        prompt,
        format: 'json',
        options: {
          temperature: 0.2,
          num_predict: 300,
        },
      });

      let parsed: { existing: string[]; new: string[] };

      try {
        parsed = JSON.parse(response.response);
      } catch {
        const jsonMatch = response.response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse Ollama response as JSON');
        }
      }

      // Match existing tag names back to DB objects (exact match first, then case-insensitive)
      const suggestedExisting = new Set(
        (parsed.existing || []).map((n) => n.trim()),
      );
      const matchedExisting = allTags.filter(
        (t) =>
          suggestedExisting.has(t.name) ||
          suggestedExisting.has(t.name.toLowerCase()),
      );

      // Sanitize new suggestions: lowercase, alphanumeric + accented + hyphens, max 3 words
      const newSuggestions = (parsed.new || [])
        .map((s) =>
          String(s)
            .toLowerCase()
            .replace(/[^a-z0-9À-ž\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '') // strip leading/trailing hyphens
            .trim(),
        )
        .filter((s) => {
          if (s.length === 0 || s.length > 50) return false;
          // Count words (hyphen-separated or space-separated segments)
          const wordCount = s.split(/[-\s]+/).filter(Boolean).length;
          return wordCount <= 3;
        })
        // Remove any that accidentally match an existing tag
        .filter(
          (s) =>
            !allTags.some(
              (t) =>
                t.name.toLowerCase().replace(/^#/, '') === s ||
                t.name.toLowerCase() === s,
            ),
        );

      if (matchedExisting.length === 0 && newSuggestions.length === 0) {
        return this.titleFallback(title);
      }

      return {
        existingTags: matchedExisting.map((t) => ({ id: t.id, name: t.name })),
        newSuggestions,
      };
    } catch (error) {
      console.error('Tag suggestion error:', (error as Error).message);
      return this.titleFallback(title);
    }
  }

  private titleFallback(title: string): {
    existingTags: { id: number; name: string }[];
    newSuggestions: string[];
  } {
    const tags = title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 3)
      .map((w) => w.replace(/[^a-z0-9À-ž-]/g, '').replace(/^-+|-+$/g, ''))
      .filter((w) => w.length > 0);
    return {
      existingTags: [],
      newSuggestions: tags.length > 0 ? tags : ['general'],
    };
  }

  private async checkOllamaConnection(): Promise<void> {
    try {
      await this.ollama.list();
    } catch {
      throw new Error(
        'Ollama is not running. Start it with "ollama serve" or launch the Ollama app.',
      );
    }
  }
}
