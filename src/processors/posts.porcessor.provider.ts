import { Provider } from '@nestjs/common';
import { PostsProcessor } from './posts.processors';
import { ConfigService } from '@nestjs/config';
import { PostsService } from '../modules/posts/posts.service';

export const PostsProcessorProvider: Provider = {
  provide: PostsProcessor,
  useFactory: (configService: ConfigService, postsService: PostsService) => {
    if (configService.get('IS_WORKER') === 'true') {
      return new PostsProcessor(postsService, configService);
    } else {
      return null;
    }
  },
  inject: [ConfigService, PostsService],
};
