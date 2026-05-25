import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AiConversationService } from './ai-conversation.service';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AuthGuard } from 'src/users/guards/auth.guard';

@Controller('ai-conversations')
@UseGuards(AuthGuard)
export class AiConversationController {
  constructor(private readonly service: AiConversationService) {}

  // GET /ai-conversations
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.sub);
  }

  // GET /ai-conversations/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.sub);
  }

  // POST /ai-conversations  { title? }
  @Post()
  create(@Body() body: { title?: string }, @Request() req: any) {
    return this.service.create(req.user.sub, body.title || 'Nouvelle conversation');
  }

  // PATCH /ai-conversations/:id  { title?, pinned? }
  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConversationDto,
    @Request() req: any,
  ) {
    return this.service.update(id, req.user.sub, dto);
  }

  // DELETE /ai-conversations/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.remove(id, req.user.sub);
  }
}
