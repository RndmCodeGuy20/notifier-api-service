# Push Notification Service

This project demonstrates a simple Bun and Hono API service that sends Server-Sent Events (SSE) based push notifications. It uses Redis for pub/sub to manage message distribution.

## Getting Started

### Prerequisites

* Bun: [https://bun.sh/](https://bun.sh/)
* Redis: [https://redis.io/](https://redis.io/)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/RndmCodeGuy20/notifier-api-service/
```

2. Navigate to the project directory:

```bash
cd notifier-api-service
```

3. Install dependencies:

```bash
bun install
```

4. Create a `.env` file in the project root and add your Redis configuration:

```
REDIS_HOST=<redis_host>  # e.g., localhost
REDIS_PORT=<redis_port>  # e.g., 6379
REDIS_PASSWORD=<redis_password> # Optional
```

### Running the Service

```bash
bun run dev
```

### API Endpoints

* `POST /send`: Send a notification (JSON body: `{"message": "your message"}`)
* `GET /stream`: Connect to the SSE stream

### Example Usage (Client-side JavaScript)

```javascript
const eventSource = new EventSource('http://localhost:5500/stream'); // Adjust port if needed

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received message:', data.message);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```
