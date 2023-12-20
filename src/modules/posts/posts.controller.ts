import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CreatePostDto } from './dtos/createPost.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePostResponce } from './responces/createPost.responce';
import { PostsService } from './posts.service';

@Controller()
@ApiTags('Posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post('posts')
  @ApiOperation({ summary: 'create new Post' })
  @ApiResponse({
    status: 201,
    description: 'The record has been successfully created.',
    type: CreatePostResponce,
  })
  async create(@Body() createPostDto: CreatePostDto) {
    Logger.verbose(createPostDto, 'PostsController.create');
    const createdPost = await this.postsService.create(createPostDto);
    return CreatePostResponce.fromPost(createdPost);
  }
}
