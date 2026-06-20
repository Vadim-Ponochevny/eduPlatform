import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { CourseOwnershipService } from './course-ownership.service'; 
import { UsersModule } from '../users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from './schemas/course.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    UsersModule,
  ],
  controllers: [CoursesController],
  providers: [CoursesService, CourseOwnershipService],
  exports: [CoursesService, CourseOwnershipService, MongooseModule], 
})
export class CoursesModule {}
