import {
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Course, CourseDocument } from '../courses/schemas/course.schema';
import { Lesson, LessonDocument } from '../lessons/schemas/lesson.schema';
import { CourseOwnershipService } from '../courses/course-ownership.service';
import { CoursesService } from '../courses/courses.service';
import { KafkaService } from '../kafka/kafka.service';
import { ImageStatus } from '../common/schemas/image-asset.schema';

@Injectable()
export class UploadService {
  private readonly originalsDir = join(process.cwd(), 'uploads', 'originals');
  private readonly processedDir = join(process.cwd(), 'uploads', 'processed');

  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    private courseOwnershipService: CourseOwnershipService,
    private coursesService: CoursesService,
    private kafkaService: KafkaService,
  ) {
    [this.originalsDir, this.processedDir].forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  async uploadCourseCover(
    courseId: string,
    teacherId: string,
    file: Express.Multer.File,
  ) {
    this.validateImage(file);

    const course = await this.courseOwnershipService.getOwnedCourseOrThrow(
      courseId,
      teacherId,
    );

    course.coverImage = {
      url: file.filename,
      status: ImageStatus.PROCESSING,
    };
    await course.save();

    await this.coursesService.invalidateCourseCache(courseId);

    await this.kafkaService.sendImageUploaded({
      filename: file.filename,
      originalPath: file.path,
      entityType: 'course',
      entityId: courseId,
    });

    return course.coverImage;
  }

  async uploadLessonImage(
    lessonId: string,
    teacherId: string,
    file: Express.Multer.File,
  ) {
    this.validateImage(file);

    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.course.toString();
    await this.courseOwnershipService.getOwnedCourseOrThrow(
      courseId,
      teacherId,
    );

    const image = {
      url: file.filename,
      status: ImageStatus.PROCESSING,
    };

    lesson.images.push(image);
    await lesson.save();

    await this.coursesService.invalidateCourseCache(courseId);

    await this.kafkaService.sendImageUploaded({
      filename: file.filename,
      originalPath: file.path,
      entityType: 'lesson',
      entityId: lessonId,
    });

    return image;
  }

  getProcessedImagePath(filename: string) {
    const filePath = join(this.processedDir, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Processed image not found');
    }
    return filePath;
  }

  private validateImage(file: Express.Multer.File) {
    if (!file.mimetype.startsWith('image/')) {
      throw new UnsupportedMediaTypeException('Only image files are allowed');
    }
  }
}