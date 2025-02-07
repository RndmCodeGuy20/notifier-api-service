import { log, wLogger } from '#helpers';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';
import redisHelper from './helpers/redis.helper';

interface WebhookPayload {
    status: string;
    job_name: string;
    project: string;
}

interface Client {
    stream: {
        writeSSE: (data: { data: string, event?: string }) => void;
    };
}

const app = new Hono();
const clients = new Set<Client>();

app.use(logger(wLogger));

app.get('/', async (ctx) => {
    return ctx.json({ message: 'Hello, World!' });
});

app.get('/events/:userId', async (ctx) => {

    const { userId } = ctx.req.param();

    log('debug', `User ${userId} connected to SSE stream`);

    return streamSSE(ctx, async (stream) => {
        const clientId = Date.now();
        const client: Client = { stream };
        let isConnected = true;

        try {
            ctx.header("Content-Type", "text/event-stream");
            ctx.header("Cache-Control", "no-cache");
            ctx.header("Connection", "keep-alive");

            // Add client to the map
            clients.add(client);
            log('info', `Client ${clientId} connected`);

            // Send initial connection message
            await stream.writeSSE({
                data: JSON.stringify({ message: 'Connected to SSE stream' }),
                event: 'connected',
                id: String(clientId),
            });

            stream.onAbort(() => {
                isConnected = false;
                clients.delete(client);
                log('info', `Client ${clientId} disconnected`);
            });

            while (isConnected) {
                try {
                    await stream.writeSSE({
                        data: JSON.stringify({ type: 'heartbeat' }),
                        event: 'heartbeat',
                        id: String(Date.now())
                    });
                    await stream.sleep(8000); // send heartbeat every 8 seconds (less than 10 seconds)
                } catch (error) {
                    log('error', `Heartbeat failed for client ${clientId}:`, error);
                    isConnected = false;
                }
            }

        } catch (error) {
            log('error', `SSE stream error for client ${clientId}:`, error);
        }
    });
});

// Webhook Route with Rate Limiting
app.post('/webhook', async (ctx) => {
    try {
        const payload = await ctx.req.json<WebhookPayload>();
        const message = JSON.stringify(payload);

        await redisHelper.publish('ci_cd_alerts', message);

        return ctx.json({ message: 'Webhook received', clientCount: clients.size });
    } catch (error) {
        log('error', 'Webhook error:', error);
        return ctx.json({ error: 'Invalid payload' }, 400);
    }
});

export default app;

export {
    clients
}