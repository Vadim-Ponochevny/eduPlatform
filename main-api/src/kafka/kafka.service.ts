import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';
import { KAFKA_TOPICS } from './kafka.constants';

export type ImageUploadedMessage = {
  filename: string;
  originalPath: string;
  entityType: 'course' | 'lesson';
  entityId: string;
};

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor(private readonly configService: ConfigService) {
    const broker = this.configService.get<string>('KAFKA_BROKER');
    if (!broker) {
      throw new Error('KAFKA_BROKER is required');
    }

    this.kafka = new Kafka({
      clientId: 'main-api',
      brokers: [broker],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async sendImageUploaded(payload: ImageUploadedMessage) {
    await this.producer.send({
      topic: KAFKA_TOPICS.IMAGE_UPLOADED,
      messages: [{ value: JSON.stringify(payload) }],
    });
  }
}