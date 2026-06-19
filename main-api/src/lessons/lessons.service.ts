import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lesson, LessonDocument } from './schemas/lesson.schema';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { CourseOwnershipService } from '../courses/course-ownership.service';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
    constructor(
        @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
        @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
        private courseOwnershipService: CourseOwnershipService, 
    ) { }

    async findByCourse(courseId: string) {
        return this.lessonModel
            .find({ course: courseId })
            .sort({ order: 1 });
    }

    async create(courseId: string, dto: CreateLessonDto, teacherId: string) {
        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(courseId, teacherId);

        const lesson = await this.lessonModel.create({
            ...dto,
            course: new Types.ObjectId(courseId),
        });

        course.lessons.push(lesson._id);
        await course.save();

        return lesson;
    }

    async update(lessonId: string, dto: UpdateLessonDto, teacherId: string) {
        const lesson = await this.lessonModel.findById(lessonId);
        if (!lesson) throw new NotFoundException('Lesson not found');

        await this.courseOwnershipService.getOwnedCourseOrThrow(lesson.course.toString(), teacherId);

        Object.assign(lesson, dto);
        return lesson.save();
    }

    async remove(lessonId: string, teacherId: string) {
        const lesson = await this.lessonModel.findById(lessonId);
        if (!lesson) throw new NotFoundException('Lesson not found');

        const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
            lesson.course.toString(),
            teacherId,
        );

        course.lessons = course.lessons.filter(
            (id) => id.toString() !== lessonId,
        );
        await course.save();
        await lesson.deleteOne();

        return { message: 'Lesson deleted' };
    }

}