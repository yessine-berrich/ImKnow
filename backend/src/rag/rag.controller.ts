import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagResponse } from './interfaces/rag-response.interface';
import { AuthGuard } from 'src/users/guards/auth.guard';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseGuards(AuthGuard)
  async ragSearch(@Body() queryDto: RagQueryDto): Promise<RagResponse> {
    return this.ragService.ragSearch(queryDto);
  }
}