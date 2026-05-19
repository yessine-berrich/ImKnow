import { Controller, Get, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchDto } from './dto/search.dto';
import { AuthGuard } from '../users/guards/auth.guard';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) { }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async globalSearch(@Query() searchDto: SearchDto) {
    const { query, limitPerType = 5, minSimilarity = 0.65 } = searchDto;
    return this.searchService.globalSearch(query, limitPerType, minSimilarity);
  }

  @Get('publications')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async searchPublications(@Query() searchDto: SearchDto) {
    const { query, limit = 10, minSimilarity = 0.65 } = searchDto;
    return {
      query,
      publications: await this.searchService.searchPublicationsOnly(query, limit, minSimilarity),
    };
  }

  @Get('categories')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async searchCategories(@Query() searchDto: SearchDto) {
    const { query, limit = 10 } = searchDto;
    return {
      query,
      categories: await this.searchService.searchCategoriesOnly(query, limit),
    };
  }

  @Get('tags')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async searchTags(@Query() searchDto: SearchDto) {
    const { query, limit = 10 } = searchDto;
    return {
      query,
      tags: await this.searchService.searchTagsOnly(query, limit),
    };
  }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async searchUsers(@Query() searchDto: SearchDto) {
    const { query, limit = 10 } = searchDto;
    return {
      query,
      users: await this.searchService.searchUsersOnly(query, limit),
    };
  }

  @Get('chunks')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async searchChunks(
    @Query('query') query: string,
    @Query('limit') rawLimit?: string,
  ) {
    if (!query?.trim()) {
      return { chunks: [] };
    }
    const limit = rawLimit ? Math.min(Math.max(parseInt(rawLimit, 10) || 5, 1), 20) : 5;
    const chunks = await this.searchService.searchChunks(query.trim(), limit);
    return { chunks };
  }
}
