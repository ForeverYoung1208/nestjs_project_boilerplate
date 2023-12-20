import { Body, Controller, Post } from '@nestjs/common';
import { CreatePostDto } from './dto/createPost.dto';

@Controller('posts')
export class PostsController {
  @Post('create')
  async create(@Body() createPostDto: CreatePostDto) {
    console.log(createPostDto);
  }
}
