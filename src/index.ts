import app, { clients } from './app.ts';
import { envConfig } from '#configs';
import { loggerConfig } from '#helpers';
import redisService from './helpers/redis.helper.ts';

const init = async () => {

    redisService.subscribe('ci_cd_alerts', (message) => {
        clients.forEach(client => {
            client.stream.writeSSE({ data: message, event: 'notification' });
        });
    });

    Bun.serve({
        fetch: app.fetch,
        port: envConfig.PORT,
        idleTimeout: 30,
    });

    loggerConfig.log(
        'verbose',
        `Listening on ${envConfig.HOSTNAME} @ http://${envConfig.HOST}:${envConfig.PORT}`,
    );

    // sendMail(); // Uncomment this line to send mail
};

const exitHandler = () => {
    if (app) {
        app.delete(() => {
            loggerConfig.info('Server closed');
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error: unknown) => {
    loggerConfig.log('error', `unexpectedErrorHandler ${error}`);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    loggerConfig.info('SIGTERM received');
    if (app) {
        app.delete();
    }
});

init()
    .then(() => {
        loggerConfig.log('verbose', 'Server started successfully');
    })
    .catch((error) => {
        loggerConfig.error(error);
        process.exit(1);
    });