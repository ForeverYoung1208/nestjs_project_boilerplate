import { Body, Controller, HttpStatus, Logger, Post } from '@nestjs/common';
import { CreatePostDto } from './dtos/createPost.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PostsService } from './posts.service';

@Controller()
@ApiTags('Posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('posts')
  @ApiOperation({ summary: 'create new Post' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The record has been successfully created.',
    type: null,
  })
  async create(@Body() createPostDto: CreatePostDto) {
    Logger.verbose(createPostDto, 'PostsController.create');
    await this.postsService.jobCreate(createPostDto);
  }
}
