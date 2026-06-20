import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

const MIN_TITLE_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 10;

export class CreateCourseDto {
  @ApiProperty({ example: 'Android для начинающих' })
  @IsString()
  @MinLength(MIN_TITLE_LENGTH)
  title: string;

  @ApiProperty({ example: 'Базовый курс по android-разработке' })
  @IsString()
  @MinLength(MIN_DESCRIPTION_LENGTH)
  description: string;
}