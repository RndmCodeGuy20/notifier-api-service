import { hostname } from 'os';

const {
    NODE_ENV,
    APP_PORT,
    APP_HOST,
} = process.env;

export const envConfig = {
    ENV: NODE_ENV,
    PORT: APP_PORT,
    HOST: APP_HOST,
    HOSTNAME: hostname(),
};