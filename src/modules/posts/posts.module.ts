import { Module, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../../entities/post.entity';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { BullModule } from '@nestjs/bull';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    DatabaseModule.register(Scope.REQUEST),
    BullModule.registerQueue({ name: 'posts' }),
  ],
  providers: [PostsController, PostsService],
  exports: [PostsController, PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
