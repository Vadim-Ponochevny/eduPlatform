import { CourseModel, LessonModel } from './schemas';

export async function markImageReady(
  entityType: 'course' | 'lesson',
  entityId: string,
  filename: string,
): Promise<void> {
  if (entityType === 'course') {
    await CourseModel.updateOne(
      { _id: entityId, 'coverImage.url': filename },
      { $set: { 'coverImage.status': 'ready' } },
    );
    return;
  }

  await LessonModel.updateOne(
    { _id: entityId, 'images.url': filename },
    { $set: { 'images.$[img].status': 'ready' } },
    { arrayFilters: [{ 'img.url': filename }] },
  );
}