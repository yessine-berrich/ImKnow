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
import { Roles } from 'src/users/decorators/user-role.decorator';
import { userRole } from 'utils/constants';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';
import { IsString, IsNotEmpty } from 'class-validator';

class SuggestTagsDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}

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
   * Returns AI-suggested tags based on article title + content.
   * Must be declared BEFORE @Post(':id') style routes to avoid conflicts.
   */
  @Post('suggest')
  @UseGuards(AuthGuard)
  async suggestTags(@Body() body: SuggestTagsDto) {
    const { title, content } = body;
    const result = await this.tagService.suggestTags(title, content);
    return {
      success: true,
      existingTags: result.existingTags,
      newSuggestions: result.newSuggestions,
    };
  }

  @Patch(':id')
  @Roles(userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagService.update(+id, updateTagDto);
  }

  @Delete(':id')
  @Roles(userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  remove(@Param('id') id: string) {
    return this.tagService.remove(+id);
  }
}