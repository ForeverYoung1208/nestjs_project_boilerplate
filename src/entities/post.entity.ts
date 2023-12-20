import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// set ApiProperty here, in entities, to enable extening them at the
// dto's definions, thus reduce boilerplate related to defining dto's.
// Note that responce properties must be defined at the corresponding responce.ts files
// in order to strictly control output data.

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @IsString()
  @ApiProperty({ example: 'some title' })
  @Column()
  title: string;

  @IsString()
  @ApiProperty({ example: 'some content' })
  @Column()
  content: string;

  @IsBoolean()
  @ApiProperty({ example: true, nullable: true, default: true })
  @Column({ default: true, nullable: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
