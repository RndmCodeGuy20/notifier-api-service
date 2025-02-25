export enum ERROR_CODES {
    UNAUTHENTICATED = 'UNAUTHENTICATED',
    UNAUTHORIZED = 'UNAUTHORIZED',
    NOT_FOUND = 'NOT_FOUND',
    NOT_ALLOWED = 'NOT_ALLOWED',
    INVALID = 'INVALID',
    DUPLICATE = 'DUPLICATE',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
    REDIS_CLIENT_NOT_INITIALIZED = 'REDIS_CLIENT_NOT_INITIALIZED',
    FAILED_TO_SET_KEY = 'FAILED_TO_SET_KEY',
    FAILED_TO_SUBSCRIBE = 'FAILED_TO_SUBSCRIBE',
    FAILED_TO_PUBLISH = 'FAILED_TO_PUBLISH',
    TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
};