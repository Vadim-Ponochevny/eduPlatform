import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { Lesson, LessonSchema } from './schemas/lesson.schema';
import { Course, CourseSchema } from '../courses/schemas/course.schema';
import { CoursesModule } from '../courses/courses.module'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lesson.name, schema: LessonSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
    CoursesModule, 
  ],
  controllers: [LessonsController],
  providers: [LessonsService],
})
export class LessonsModule {}