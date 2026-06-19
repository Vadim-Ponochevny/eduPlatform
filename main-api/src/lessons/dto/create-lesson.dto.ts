import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 'Введение' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Текст первого урока...' })
  @IsString()
  @MinLength(10)
  content: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  order: number;
}