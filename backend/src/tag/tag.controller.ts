import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { SuggestTagsDto } from './dto/suggest-tags.dto';
import { Roles } from 'src/users/decorators/user-role.decorator';
import { userRole } from 'utils/constants';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';

@Controller('api/tags')
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.tagService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.tagService.findOne(+id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Body() createTagDto: CreateTagDto) {
    return this.tagService.create(createTagDto);
  }

  /**
   * POST /api/tags/suggest
   * Must be declared before @Post(':id') routes to avoid routing conflicts.
   */
  @Post('suggest')
  @UseGuards(AuthGuard)
  async suggestTags(@Body() body: SuggestTagsDto) {
    const result = await this.tagService.suggestTags(body.title, body.content);
    return {
      success: true,
      existingTags: result.existingTags,
      newSuggestions: result.newSuggestions,
    };
  }

  @Patch(':id')
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagService.update(+id, updateTagDto);
  }

  @Delete(':id')
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  remove(@Param('id') id: string) {
    return this.tagService.remove(+id);
  }
}
