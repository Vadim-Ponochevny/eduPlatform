import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Android для начинающих' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'Базовый курс по android-разработке' })
  @IsString()
  @MinLength(10)
  description: string;
}