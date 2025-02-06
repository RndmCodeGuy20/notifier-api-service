import { log, loggerConfig, wLogger } from '#helpers';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { streamSSE } from 'hono/streaming';

interface Client {
    id: number;
    stream: {
        writeSSE: (data: SSEMessage) => void;
        sleep: (ms: number) => Promise<void>;
    };
}

interface WebhookPayload {
    status: string;
    job_name: string;
    project: string;
}

interface SSEMessage {
    data: string;
    event?: string;
    id?: string;
}

const app = new Hono();
const clients = new Map<number, Client>();

app.use(logger(wLogger));

app.get('/', (ctx) => {
    return ctx.json({ message: 'Hello World!' });
});

app.get('/events', async (ctx) => {
    return streamSSE(ctx, async (stream) => {
        const clientId = Date.now();
        let isConnected = true;

        try {
            // Add client to the map
            clients.set(clientId, { id: clientId, stream });
            log('info', `Client ${clientId} connected`);

            // Send initial connection message
            await stream.writeSSE({
                data: JSON.stringify({ message: 'Connected to SSE stream' }),
                event: 'connected',
                id: String(clientId),
            });

            // Keep connection alive with periodic heartbeat
            while (isConnected) {
                try {
                    await stream.writeSSE({
                        data: JSON.stringify({ type: 'heartbeat' }),
                        event: 'heartbeat',
                        id: String(Date.now())
                    });
                    await stream.sleep(30000); // Heartbeat every 30 seconds
                } catch (error) {
                    log('error', `Heartbeat failed for client ${clientId}:`, error);
                    isConnected = false;
                }
            }
        } catch (error) {
            log('error', `SSE stream error for client ${clientId}:`, error);
        } finally {
            // Clean up when the connection ends
            if (clients.has(clientId)) {
                clients.delete(clientId);
                log('info', `Client ${clientId} disconnected`);
            }
        }
    });
});

app.post('/webhook', async (ctx) => {
    try {
        const payload = await ctx.req.json<WebhookPayload>();
        log('info', 'Webhook received:', payload);

        const { status, job_name, project } = payload;
        const message = `Job: ${job_name}, Project: ${project}, Status: ${status}`;
        const disconnectedClients: number[] = [];

        // Send message to all connected clients
        for (const [clientId, client] of clients.entries()) {
            try {
                await client.stream.writeSSE({
                    data: JSON.stringify({ message }),
                    event: 'notification',
                    id: String(Date.now()),
                });
            } catch (error) {
                log('error', `Failed to send message to client ${clientId}:`, error);
                disconnectedClients.push(clientId);
            }
        }

        // Clean up disconnected clients
        disconnectedClients.forEach(clientId => {
            clients.delete(clientId);
        });

        return ctx.json({
            message: 'Webhook received',
            clientCount: clients.size
        });
    } catch (error) {
        log('error', 'Webhook error:', error);
        return ctx.json({
            error: 'Invalid webhook payload'
        }, 400);
    }
});

app.notFound((ctx) => {
    return ctx.json({ message: 'Not Found' }, { status: 404 });
});

export default app;