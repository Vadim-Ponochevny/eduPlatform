import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

const MIN_TITLE_LENGTH = 3;
const MIN_CONTENT_LENGTH = 10;
const MIN_ORDER_VALUE = 1;

export class CreateLessonDto {
  @ApiProperty({ example: 'Введение' })
  @IsString()
  @MinLength(MIN_TITLE_LENGTH)
  title: string;

  @ApiProperty({ example: 'Текст первого урока...' })
  @IsString()
  @MinLength(MIN_CONTENT_LENGTH)
  content: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(MIN_ORDER_VALUE)
  order: number;
}