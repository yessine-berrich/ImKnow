import { Controller, Post, Body, UsePipes, ValidationPipe, UseGuards, Request } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagResponse } from './interfaces/rag-response.interface';
import { AuthGuard } from 'src/users/guards/auth.guard';
import { AuthRolesGuard } from 'src/users/guards/auth-roles.guard';
import { Roles } from 'src/users/decorators/user-role.decorator';
import { userRole, PublicationStatus } from 'utils/constants';
import { PublicationChunkService } from 'src/publication/publication-chunk.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Publication } from 'src/publication/entities/publication.entity';
import { Repository } from 'typeorm';

@Controller('rag')
export class RagController {
  constructor(
    private readonly ragService: RagService,
    private readonly publicationChunkService: PublicationChunkService,
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseGuards(AuthGuard)
  async ragSearch(@Body() queryDto: RagQueryDto, @Request() req: any): Promise<RagResponse> {
    return this.ragService.ragSearch(queryDto, req.user.sub);
  }

  @Post('reindex')
  @UseGuards(AuthGuard, AuthRolesGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  async reindexAllChunks(): Promise<{ message: string; queued: number }> {
    const publications = await this.publicationRepository.find({
      where: { status: PublicationStatus.PUBLISHED },
      select: ['id'],
    });

    for (const pub of publications) {
      this.publicationChunkService.generateChunks(pub.id).catch(console.error);
    }

    return { message: 'Reindexing started', queued: publications.length };
  }
}