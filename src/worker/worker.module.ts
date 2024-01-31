import { Module } from '@nestjs/common';
import { PostsProcessor } from '../processors/posts.processors';
import { PostsModule } from '../modules/posts/posts.module';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from '../entities/post.entity';
import config from '../config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      validationSchema: config().envValidationConfig,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('databaseConfig'),
    }),
    TypeOrmModule.forFeature([Post]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redisConfig');
        console.log('[redisConfig]', redisConfig);
        return redisConfig;
      },
    }),
    BullModule.registerQueue({ name: 'posts' }),
    PostsModule,
  ],
  providers: [PostsProcessor],
})
export class WorkerModule {}
