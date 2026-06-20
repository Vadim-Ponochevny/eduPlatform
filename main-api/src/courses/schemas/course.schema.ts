import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ImageAsset, ImageAssetSchema } from '../../common/schemas/image-asset.schema';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacher: Types.ObjectId;

  @Prop({ type: ImageAssetSchema, default: null })
  coverImage?: ImageAsset | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  lessons: Types.ObjectId[];

  @Prop({ default: 0 })
  studentsCount: number;
}

export const CourseSchema = SchemaFactory.createForClass(Course);