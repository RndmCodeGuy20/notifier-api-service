import { hostname } from 'os';

const {
    NODE_ENV,
    APP_PORT,
    APP_HOST,
    REDIS_HOST,
    REDIS_PORT,
} = process.env;

export const envConfig = {
    ENV: NODE_ENV,
    PORT: APP_PORT,
    HOST: APP_HOST,
    HOSTNAME: hostname(),
    REDIS: {
        HOST: REDIS_HOST,
        PORT: REDIS_PORT,
    },
};