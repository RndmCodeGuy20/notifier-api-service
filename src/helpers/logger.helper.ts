import winston from 'winston';
import { envConfig } from '#configs';

/**
 * Get all fields from an object except certain keys.
 * @param obj The original object.
 * @param keysToExclude The keys to exclude from the result.
 * @returns A new object without the excluded keys.
 */
function excludeKeys<T extends Record<string, any>>(obj: T, keysToExclude: (keyof T)[]): Partial<T> {
    const result = { ...obj };
    keysToExclude.forEach(key => {
        delete result[key];
    });
    return result;
}

/**
 * Check if an object is empty.
 * @param obj The object to check.
 * @returns True if the object is empty, false otherwise.
 */
function isEmptyObject(obj: Record<string, any>): boolean {
    return Object.keys(obj).length === 0;
}

const productionFormat = winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.timestamp(),
    winston.format.json(),
);

const developmentFormat = winston.format.combine(
    winston.format.colorize({
        all: true,
        colors: {
            debug: 'blue',
            info: 'green',
            warn: 'yellow',
            error: 'red',
            verbose: 'italic cyan',
            http: 'magenta',
        },
    }),
    winston.format.splat(),
    winston.format.errors({ stack: true }),
    winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
    winston.format.json({
        space: 2,
        replacer: (key, value) => {
            if (key === 'timestamp') {
                return undefined;
            }
            return value;
        },
    }),
    winston.format.printf(
        ({ timestamp, level, message, label = 'boot', stack, ...metadata }) => {
            const msg = {
                timestamp,
                level,
                message,
                label,
                stack,
                ...metadata,
            };

            if (stack) {
                // eslint-disable-next-line max-len
                return `${msg.timestamp} [${msg.level}] ${msg.label ? `(${msg.label})` : ''}: ${msg.message}\n${msg.stack}`;
            }

            const metaData = excludeKeys(metadata, ['service', 'req', 'res']);

            return `${msg.timestamp} [${msg.level}] ${msg.label ? `(${msg.label})` : ''}: ${msg.message} ${isEmptyObject(metaData) ? '' : '\n' + JSON.stringify(metaData, null, 2)}`;
        },
    ),
    // winston.format.align(),
);

const logTailFormat = winston.format((info) => {
    return info;
});

const loggerConfig = winston.createLogger({
    level: envConfig.ENV === 'production' ? 'info' : 'silly',
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
    },
    format: envConfig.ENV === 'production' ? productionFormat : developmentFormat,
    defaultMeta: { service: 'main' },
    transports: [
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/combined.log' }),
    ],
});

if (envConfig.ENV !== 'production') {
    loggerConfig.add(
        new winston.transports.Console({
            format: developmentFormat,
        }),
    );
}

export const logger = (
    level: string,
    message: string,
    label: string,
    req: unknown,
    res: unknown,
    meta: object | undefined,
    details: object | undefined,
) => {
    loggerConfig.log(level, message, { label, req, res, meta }, details);
};

export const log = (level: string, message: string, ...meta: unknown[]) => {
    loggerConfig.log(level, message, ...meta);
};

export { loggerConfig };

export const wLogger = (message: string, ...args: string[]) => {
    loggerConfig.log('http', message, { label: 'api' }, args);
};