import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const REDIS_URL_ENV = 'REDIS_URL';
const DEFAULT_TTL_SECONDS = 60;
const EXPIRE_MODE = 'EX';
const MASKED_URL = '://***:***@';
const MASK_REGEX = /:\/\/[^:]+:([^@]+)@/;

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(REDIS_URL_ENV);
    if (!redisUrl) {
      this.logger.error(`${REDIS_URL_ENV} environment variable is not set`);
      throw new Error(`${REDIS_URL_ENV} is required`);
    }

    this.client = new Redis(redisUrl);
    this.logger.log(`Redis client created with URL: ${this.maskUrl(redisUrl)}`);

    this.client.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`, err.stack);
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(
        `Failed to get key "${key}": ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.client.set(key, serialized, EXPIRE_MODE, ttlSeconds);
    } catch (error) {
      this.logger.error(
        `Failed to set key "${key}": ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.client.del(...keys);
    } catch (error) {
      this.logger.error(
        `Failed to delete keys [${keys.join(', ')}]: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      this.logger.error(`Ping failed: ${error.message}`);
      throw error;
    }
  }

  private maskUrl(url: string): string {
    return url.replace(MASK_REGEX, MASKED_URL);
  }

  onModuleDestroy() {
    this.logger.log('Disconnecting Redis client...');
    this.client.disconnect();
  }
}