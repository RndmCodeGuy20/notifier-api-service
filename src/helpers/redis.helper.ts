import { createClient, type RedisClientType } from 'redis';
import { envConfig } from '#configs';
import { log, loggerConfig } from '#helpers';
import { StatusCodes } from 'http-status-codes';
import type { IErrorInfo } from '#types';
import { ERROR_CODES } from '#constants';

class RedisServiceError extends Error {
    private readonly info: IErrorInfo;
    private readonly status: number;
    private readonly errorCode: ERROR_CODES;
    constructor(
        message: string,
        info: IErrorInfo,
        httpStatus: number,
        errorCode: ERROR_CODES,
    ) {
        super(message);
        this.name = 'RedisServiceError';
        this.info = info;
        this.status = httpStatus;
        this.errorCode = errorCode;
    }
}

class RedisService {
    private client: RedisClientType | null = null;
    private subscriber: RedisClientType | null = null;
    private redisStatus: 'inactive' | 'active' = 'inactive';
    private readonly vercelRedisUrl: string; // Store the URL

    constructor(vercelRedisUrl: string) {
        this.vercelRedisUrl = vercelRedisUrl;
    }

    public async initialize(): Promise<void> {
        try {
            log('verbose', `Initializing Redis client`);
            this.client = createClient({ url: this.vercelRedisUrl });
            this.subscriber = this.client.duplicate(); // Use duplicate for subscriber

            this.client.on('connect', () => {
                log('verbose', 'Redis connection established');
                this.redisStatus = 'active';
            });

            this.subscriber.on('connect', () => {
                log('verbose', 'Redis subscriber connected');
            });

            this.client.on('error', (err) => {
                loggerConfig.log('error', `Redis error: ${err.message}`);
                this.redisStatus = 'inactive';
            });

            this.subscriber.on('error', (err) => {
                loggerConfig.log('error', `Redis subscriber error: ${err.message}`);
            });

            await this.client.connect();
            await this.subscriber.connect();
        } catch (error: unknown) {
            loggerConfig.log('error', `Failed to initialize Redis client: ${error instanceof Error ? error.message : 'Unknown error'}`); // Type guard
            this.redisStatus = 'inactive';
            throw new RedisServiceError(
                'Failed to initialize Redis client',
                { service: 'redis', message: error instanceof Error ? error.message : 'Unknown error', metadata: error }, // Type guard
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
            );
        }
    }

    public async get(key: string): Promise<any> { // Use 'any' or a more specific type if known
        if (!this.client) {
            throw new RedisServiceError(
                'Redis client is not initialized',
                { service: 'redis', message: 'Client is undefined' },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.REDIS_CLIENT_NOT_INITIALIZED
            );
        }
        const result = await this.client.GET(key);
        try {
            return JSON.parse(result ?? '');
        } catch {
            return result;
        }
    }

    public async set(key: string, value: unknown): Promise<void> {
        if (!this.client) {
            throw new RedisServiceError(
                'Redis client is not initialized',
                { service: 'redis', message: 'Client is undefined' },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.REDIS_CLIENT_NOT_INITIALIZED
            );
        }
        try {
            const stringifiedValue = typeof value === 'object' ? JSON.stringify(value) : value?.toString() ?? '';
            await this.client.SET(key, stringifiedValue);
        } catch (e) {
            throw new RedisServiceError(
                'FAILED_TO_SET_KEY',
                { service: 'redis', message: `Failed to set key ${key}, ${e instanceof Error ? e.message : 'Unknown error'}` }, // Type guard
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.FAILED_TO_SET_KEY,
            );
        }
    }

    public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        if (!this.subscriber) {
            throw new RedisServiceError(
                'Redis subscriber client is not initialized',
                { service: 'redis', message: 'Subscriber client is undefined' },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.REDIS_CLIENT_NOT_INITIALIZED
            );
        }

        await this.subscriber.subscribe(channel, (message) => {
            log('info', `Received message on ${channel}: ${message}`);
            callback(message);
        });

        log('verbose', `Successfully subscribed to Redis channel: ${channel}`);
    }

    public async publish(channel: string, message: string): Promise<void> {
        if (!this.client) {
            throw new RedisServiceError(
                'Redis client is not initialized',
                { service: 'redis', message: 'Client is undefined' },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.REDIS_CLIENT_NOT_INITIALIZED
            );
        }
        try {
            await this.client.publish(channel, message);
        } catch (e) {
            throw new RedisServiceError(
                'FAILED_TO_PUBLISH',
                { service: 'redis', message: `Failed to publish message to channel ${channel}, ${e instanceof Error ? e.message : 'Unknown error'}` }, // Type guard
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.FAILED_TO_PUBLISH,
            );
        }
    }

    public async quit(): Promise<void> {
        if (this.client) {
            await this.client.quit();
        }
        if (this.subscriber) {
            await this.subscriber.quit();
        }
    }


    get status() {
        return this.redisStatus;
    }
}


// Example usage (dependency injection):
const vercelRedisUrl = envConfig.REDIS.VERCEL_URL;
const redisService = new RedisService(vercelRedisUrl);
await redisService.initialize();

export default redisService;