import { createClient, type RedisClientType } from 'redis';
import { envConfig } from '#configs';
import { log, loggerConfig } from '#helpers';
import { StatusCodes } from 'http-status-codes';
import type { IErrorInfo } from '#types';
import { ERROR_CODES } from '#constants';

const vercelRedisUrl = envConfig.REDIS.VERCEL_URL;
let client: RedisClientType;
let subscriber: RedisClientType; // Separate client for subscriptions

export let redis_status = 'inactive';

class RedisServiceError extends Error {
    private readonly info: IErrorInfo;
    private readonly status: number;
    private readonly errorCode: string;
    constructor(
        message: string,
        info: IErrorInfo,
        httpStatus: number,
        errorCode: string,
    ) {
        super(message);
        this.name = 'RedisServiceError';
        this.info = info;
        this.status = httpStatus;
        this.errorCode = errorCode;
    }
}

export const redisHelper = {
    initRedisClient: async () => {
        try {
            log('verbose', `Initializing Redis client`);
            client = createClient({ url: vercelRedisUrl });
            subscriber = createClient({ url: vercelRedisUrl }); // Separate client for subscriptions

            client.on('connect', () => {
                log('verbose', 'Redis connection established');
                redis_status = 'active';
            });

            subscriber.on('connect', () => {
                log('verbose', 'Redis subscriber connected');
            });

            client.on('error', (err) => {
                loggerConfig.log('error', `Redis error: ${err.message}`);
                redis_status = 'inactive';
            });

            subscriber.on('error', (err) => {
                loggerConfig.log('error', `Redis subscriber error: ${err.message}`);
            });

            await client.connect();
            await subscriber.connect(); // Connect the subscriber client
        } catch (error: unknown) {
            loggerConfig.log('error', `Failed to initialize Redis client: ${error.message}`);
            redis_status = 'inactive';
            throw new RedisServiceError(
                'Failed to initialize Redis client',
                { service: 'redis', message: error.message, metadata: error },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
            );
        }
    },

    // Redis commands
    get: async (key: string) => {
        const result = await client.GET(key);
        try {
            return JSON.parse(result ?? '');
        } catch {
            return result; // Return as is if JSON parsing fails
        }
    },

    set: async (key: string, value: unknown) => {
        try {
            if (typeof value === 'object') {
                await client.SET(key, JSON.stringify(value));
            } else {
                await client.SET(key, value?.toString() ?? '');
            }
            return true;
        } catch (e) {
            throw new RedisServiceError(
                'FAILED_TO_SET_KEY',
                { service: 'redis', message: `Failed to set key ${key}, ${e.message}` },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
            );
        }
    },

    subscribe: async (channel: string, callback: (message: string) => void) => {
        try {
            if (!subscriber) {
                throw new RedisServiceError(
                    'Redis subscriber client is not initialized',
                    { service: 'redis', message: 'Subscriber client is undefined' },
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    ERROR_CODES.INTERNAL_SERVER_ERROR
                );
            }

            if (!subscriber.isReady) {
                log('verbose', 'Waiting for Redis subscriber to be ready...');
                await new Promise((resolve) => subscriber.once('ready', resolve));
            }

            await subscriber.subscribe(channel, (message) => {
                log('info', `Received message on ${channel}: ${message}`);
                callback(message);
            });

            log('verbose', `Successfully subscribed to Redis channel: ${channel}`);
        } catch (e) {
            throw new RedisServiceError(
                'FAILED_TO_SUBSCRIBE',
                { service: 'redis', message: `Failed to subscribe to channel ${channel}, ${e.message}` },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
            );
        }
    },

    publish: async (channel: string, message: string) => {
        try {
            await client.publish(channel, message);
            return true;
        } catch (e) {
            throw new RedisServiceError(
                'FAILED_TO_PUBLISH',
                { service: 'redis', message: `Failed to publish message to channel ${channel}, ${e.message}` },
                StatusCodes.INTERNAL_SERVER_ERROR,
                ERROR_CODES.INTERNAL_SERVER_ERROR,
            );
        }
    },

    quit: async () => {
        await client.quit();
        await subscriber.quit();
    },
};

export default redisHelper;
