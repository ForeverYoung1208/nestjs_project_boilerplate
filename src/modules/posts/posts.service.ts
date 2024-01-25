import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Post } from '../../entities/post.entity';
import { CreatePostDto } from './dtos/createPost.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PostsService {
  private readonly postsRepositry: Repository<Post>;
  constructor(
    @Inject('data_source')
    private readonly dataSource: DataSource,
    @InjectQueue('posts')
    private postsQueue: Queue,
  ) {
    this.postsRepositry = dataSource.getRepository(Post);
  }

  async create(post: CreatePostDto): Promise<Post> {
    const newPost = await this.postsRepositry.save(post);
    return newPost;
  }

  // JOB starters

  async jobCreate(createPostDto: CreatePostDto): Promise<void> {
    const quedPost = await this.postsQueue.add(createPostDto);
    Logger.debug(`------Job ${quedPost.id} created----------`);
    console.dir(quedPost.data);
  }
}
