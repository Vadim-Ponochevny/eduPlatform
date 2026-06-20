import {
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CourseOwnershipService } from '../courses/course-ownership.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { RedisService } from '../redis/redis.service';
import { COURSES_LIST_KEY, courseCacheKey } from '../courses/courses-cache.keys';

@Injectable()
export class LessonsService {
    private readonly logger = new Logger(LessonsService.name);
    constructor(
        @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        private courseOwnershipService: CourseOwnershipService, 
        private redisService: RedisService,
    ) { }

    async findByCourse(courseId: string) {
        return this.lessonModel
            .find({ course: new Types.ObjectId(courseId) })
            .sort({ order: 1 });
    }

    async create(courseId: string, dto: CreateLessonDto, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
          courseId,
          teacherId,
        );
      
        const lesson = await this.lessonModel.create({
          ...dto,
          course: new Types.ObjectId(courseId),
        });
      
        course.lessons.push(lesson._id);
        await course.save();
      
        await this.invalidateCourseCache(courseId).catch((err) =>
          this.logger.error(
            `Cache invalidation failed for course ${courseId}: ${err.message}`,
            err.stack,
          ),
        );
      
        return lesson;
    }

    async update(lessonId: string, dto: UpdateLessonDto, teacherId: string) {
        const lesson = await this.lessonModel.findById(lessonId);
        if (!lesson) throw new NotFoundException('Lesson not found');
    
        await this.courseOwnershipService.getOwnedCourseOrThrow(lesson.course.toString(), teacherId);
    
        Object.assign(lesson, dto);
        await lesson.save();
        await this.invalidateCourseCache(lesson.course.toString()).catch(err => 
            this.logger.error(`Cache invalidation failed: ${err.message}`)
        );
        return lesson;
    }

    async remove(lessonId: string, teacherId: string) {
        const lesson = await this.lessonModel.findById(lessonId);
        if (!lesson) throw new NotFoundException('Lesson not found');
    
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
            lesson.course.toString(),
            teacherId,
        );
    
        await lesson.deleteOne();
    
        course.lessons = course.lessons.filter(id => id.toString() !== lessonId);
        await course.save();
    
        const courseId = lesson.course.toString();
        await this.invalidateCourseCache(courseId).catch(err =>
            this.logger.error(`Cache invalidation failed: ${err.message}`)
        );
    
        return { message: 'Lesson deleted' };
    }

    private async invalidateCourseCache(courseId: string) {
        await this.redisService.del(COURSES_LIST_KEY, courseCacheKey(courseId));
    }

}
