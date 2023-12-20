import { ApiProperty } from '@nestjs/swagger';
import { Post } from '../../../entities/post.entity';
import { Exclude, Expose, plainToInstance } from 'class-transformer';

@Exclude()
export class CreatePostResponce {
  @Expose()
  @ApiProperty({ example: 123 })
  id: number;

  @Expose()
  @ApiProperty({ example: 'some title' })
  title: string;

  @Expose()
  @ApiProperty({ example: 'some content' })
  content: string;

  static fromPost(post: Post): CreatePostResponce {
    const res = plainToInstance(CreatePostResponce, post, {
      excludeExtraneousValues: true,
    });
    return res;
  }
}
