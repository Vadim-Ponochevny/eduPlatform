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

@Injectable()
export class CoursesService {
    constructor(
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        private usersService: UsersService,
        private courseOwnershipService: CourseOwnershipService, 
    ) { }

    async findAll() {
        return this.courseModel
            .find()
            .populate('teacher', 'name email')
            .sort({ createdAt: -1 });
    }

    async findById(id: string) {
        const course = await this.courseModel
            .findById(id)
            .populate('teacher', 'name email')
            .populate('lessons');

        if (!course) throw new NotFoundException('Course not found');
        return course;
    }

    async create(dto: CreateCourseDto, teacherId: string) {
        return this.courseModel.create({
            ...dto,
            teacher: new Types.ObjectId(teacherId),
        });
    }

    async update(id: string, dto: UpdateCourseDto, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(id, teacherId);
        Object.assign(course, dto);
        return course.save();
    }

    async remove(id: string, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(id, teacherId);
        await course.deleteOne();
        return { message: 'Course deleted' };
    }

    async enroll(courseId: string, studentId: string) {
        const course = await this.courseModel.findById(courseId);
        if (!course) throw new NotFoundException('Course not found');

        await this.usersService.enrollToCourse(studentId, courseId);
        course.studentsCount += 1;
        await course.save();

        return { message: 'Enrolled successfully' };
    }
}
