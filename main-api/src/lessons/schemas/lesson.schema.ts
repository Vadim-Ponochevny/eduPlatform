import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ImageAsset, ImageAssetSchema } from '../../common/schemas/image-asset.schema';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ timestamps: true })
export class Lesson {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Types.ObjectId;

  @Prop({ type: [ImageAssetSchema], default: [] })
  images: ImageAsset[];

  @Prop({ required: true, min: 1 })
  order: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);