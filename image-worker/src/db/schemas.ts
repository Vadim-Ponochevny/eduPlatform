import mongoose, { Schema } from 'mongoose';

const ImageAssetSchema = new Schema(
  {
    url: { type: String, required: true },
    status: { type: String, enum: ['processing', 'ready'], default: 'processing' },
  },
  { _id: false },
);

export const CourseModel = mongoose.model(
  'Course',
  new Schema({
    coverImage: { type: ImageAssetSchema, default: null },
  }),
);

export const LessonModel = mongoose.model(
  'Lesson',
  new Schema({
    images: { type: [ImageAssetSchema], default: [] },
  }),
);