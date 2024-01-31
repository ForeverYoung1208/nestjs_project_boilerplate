import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dtos/createPost.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepositry: Repository<Post>,
    @InjectQueue('posts')
    private postsQueue: Queue,
  ) {}

  async create(post: CreatePostDto): Promise<Post> {
    return this.postsRepositry.save(post);
  }

  // JOB starters

  async jobCreate(createPostDto: CreatePostDto): Promise<void> {
    const quedPost = await this.postsQueue.add(createPostDto, { attempts: 10 });
    Logger.debug(`------Job ${quedPost.id} created----------`);
    console.dir(quedPost.data);
  }
}
