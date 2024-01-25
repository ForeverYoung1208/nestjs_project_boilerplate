import { Process, Processor } from '@nestjs/bull';
import { CreatePostDto } from '../modules/posts/dtos/createPost.dto';
import { Job } from 'bull';
import { PostsService } from '../modules/posts/posts.service';
import { ConfigService } from '@nestjs/config';

@Processor('posts')
export class PostsProcessor {
  constructor(
    private readonly postsService: PostsService,
    private readonly confingService: ConfigService,
  ) {}
  @Process()
  async processPost(job: Job<CreatePostDto>) {
    console.log(`started job processor for job id  ${job.id}`);
    const isWorker = this.confingService.get('IS_WORKER');
    if (isWorker === 'true') {
      console.log('worker has picked a job');
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 8000));
      const res = await this.postsService.create(job.data);
      console.log('job ---------DONE-----------: ', res);
    } else {
      console.log('it is not a worker, keep work for worker');
      return Promise.reject('it is not a worker, keep work for worker');
    }
  }
}
