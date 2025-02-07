import { hostname } from 'os';

const {
    NODE_ENV,
    APP_PORT,
    APP_HOST,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_URL
} = process.env;

export const envConfig = {
    ENV: NODE_ENV ?? "development",
    PORT: APP_PORT ?? "5500",
    HOST: APP_HOST ?? "localhost",
    HOSTNAME: hostname(),
    REDIS: {
        HOST: REDIS_HOST,
        PORT: REDIS_PORT,
        VERCEL_URL: REDIS_URL ?? "redis://default:rJpy1XyFTrnqVeonwrnx1k0sWkxv653i@redis-10445.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:10445"
    },
};