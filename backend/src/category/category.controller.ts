// category.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from 'src/users/decorators/user-role.decorator';
import { userRole } from 'utils/constants';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';


@Controller('api/categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) { }

  @Get()
  @UseGuards(AuthGuard)
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @Post()
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Patch(':id')
  @Roles(userRole.SUPERADMIN, userRole.ADMIN)
  @UseGuards(AuthRolesGuard)
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(+id, updateCategoryDto);
  }

  @Delete(':id')
  @Roles(userRole.SUPERADMIN, userRole.ADMIN, userRole.EMPLOYEE)
  @UseGuards(AuthRolesGuard)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(+id);
  }

  @Get(':id/articles')
  @UseGuards(AuthGuard)
  findArticlesByCategory(@Param('id') id: string) {
    return this.categoryService.findArticlesByCategory(+id);
  }
}