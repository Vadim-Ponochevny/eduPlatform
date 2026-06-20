import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UsersService } from '../users/users.service';
import { CourseOwnershipService } from './course-ownership.service'; 
import { RedisService } from '../redis/redis.service';
import { COURSES_LIST_KEY, courseCacheKey } from './courses-cache.keys';

@Injectable()
export class CoursesService {
    constructor(
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        private usersService: UsersService,
        private courseOwnershipService: CourseOwnershipService, 
        private redisService: RedisService,
    ) { }   

    async findAll() {
        const cached = await this.redisService.get(COURSES_LIST_KEY);
        if (cached) {
            return cached;
        }
        const courses = await this.courseModel
            .find()
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 })
            .lean();
        await this.redisService.set(COURSES_LIST_KEY, courses);
        return courses;
    }

    async findById(id: string) {
        const cacheKey = courseCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          return cached;
        }
        const course = await this.courseModel
          .findById(id)
          .populate('teacher', 'name email')
          .populate('lessons')
          .lean();
        if (!course) {
          throw new NotFoundException('Course not found');
        }
        await this.redisService.set(cacheKey, course);
        return course;
    }

    async create(dto: CreateCourseDto, teacherId: string) {
        const course = await this.courseModel.create({
          ...dto,
          teacher: new Types.ObjectId(teacherId),
        });
        await this.invalidateCourseCache();
        return course;
    }

    async update(id: string, dto: UpdateCourseDto, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
          id,
          teacherId,
        );
        Object.assign(course, dto);
        const updated = await course.save();
        await this.invalidateCourseCache(id);
        return updated;
    }

    async remove(id: string, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
          id,
          teacherId,
        );
        await course.deleteOne();
        await this.invalidateCourseCache(id);
        return { message: 'Course deleted' };
    }

      async enroll(courseId: string, studentId: string) {
        const course = await this.courseModel.findById(courseId);
        if (!course) {
          throw new NotFoundException('Course not found');
        }
        await this.usersService.enrollToCourse(studentId, courseId);
        course.studentsCount += 1;
        await course.save();
        await this.invalidateCourseCache(courseId);
        return { message: 'Enrolled successfully' };
    }

    async invalidateCourseCache(courseId?: string) {
        const keys = [COURSES_LIST_KEY];
        if (courseId) {
          keys.push(courseCacheKey(courseId));
        }
        await this.redisService.del(...keys);
    }
}
