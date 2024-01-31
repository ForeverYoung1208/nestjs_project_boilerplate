import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post]),
    BullModule.registerQueue({ name: 'posts' }),
  ],
  providers: [PostsController, PostsService],
  exports: [PostsController, PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
