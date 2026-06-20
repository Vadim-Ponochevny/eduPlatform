import 'dotenv/config';
import Fastify from 'fastify';
import { Kafka } from 'kafkajs';
import mongoose from 'mongoose';
import { join, resolve } from 'path';
import { existsSync } from 'fs';
import { KAFKA_TOPICS, CONSUMER_GROUP } from './kafka.constants';
import { processImage } from './image.processor';
import { markImageReady } from './db/update-status';

type ImageUploadedMessage = {
  filename: string;
  originalPath: string;
  entityType: 'course' | 'lesson';
  entityId: string;
};

const MONGO_URI = process.env.MONGO_URI!;
const KAFKA_BROKER = process.env.KAFKA_BROKER!;
const PROCESSED_DIR = resolve(process.cwd(), process.env.PROCESSED_DIR ?? '../main-api/uploads/processed');
const WORKER_PORT = Number(process.env.WORKER_PORT ?? 3001);

async function bootstrap() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');

  const kafka = new Kafka({
    clientId: 'image-worker',
    brokers: [KAFKA_BROKER],
  });

  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
  const producer = kafka.producer();

  await consumer.connect();
  await producer.connect();
  console.log('Kafka connected');

  await consumer.subscribe({ topic: KAFKA_TOPICS.IMAGE_UPLOADED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const payload = JSON.parse(message.value.toString()) as ImageUploadedMessage;
      console.log('Received task:', payload);

      const { filename, originalPath, entityType, entityId } = payload;

      if (!existsSync(originalPath)) {
        console.error('Original file not found:', originalPath);
        return;
      }

      const outputPath = join(PROCESSED_DIR, filename);

      try {
        await processImage(originalPath, outputPath);
        await markImageReady(entityType, entityId, filename);

        await producer.send({
          topic: KAFKA_TOPICS.IMAGE_PROCESSED,
          messages: [
            {
              value: JSON.stringify({
                filename,
                entityType,
                entityId,
                status: 'ready',
              }),
            },
          ],
        });

        console.log('Processed:', filename);
      } catch (error) {
        console.error('Processing failed:', error);
      }
    },
  });

  const app = Fastify();
  app.get('/health', async () => ({ status: 'ok', service: 'image-worker' }));

  await app.listen({ port: WORKER_PORT, host: '0.0.0.0' });
  console.log(`Image Worker running on http://localhost:${WORKER_PORT}`);
}

bootstrap().catch((err) => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});