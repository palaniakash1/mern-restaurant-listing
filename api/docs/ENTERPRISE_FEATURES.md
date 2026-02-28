# Enterprise-Grade Features - Learning Guide

This document explains the enterprise-grade features implemented in your backend.

---

## 📊 1. Metrics & Observability

### What is it?

Prometheus-style metrics endpoint that tracks application performance.

### Files

- `api/middlewares/metrics.js`

### Usage

```javascript
import {
  metricsMiddleware,
  createMetricsEndpoint,
} from "./middlewares/metrics.js";

// Add to app.js
app.use(metricsMiddleware);
app.get("/api/metrics", createMetricsEndpoint());
```

### What it tracks

- **Request counts** - How many requests per endpoint
- **Response times** - Histogram with p50, p90, p95, p99
- **Error rates** - Errors by status code
- **Memory usage** - Heap, RSS, external
- **CPU usage** - User and system time
- **System load** - OS load average

### Example Output

```bash
# Prometheus format
http_requests_total{method="GET",endpoint="/api/restaurants"} 150
http_request_duration_seconds_bucket{le="0.1"} 120

# JSON format
GET /api/metrics?format=json
```

### Learning Resources

- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Node.js Metrics](https://nodejs.org/api/perf_hooks.html)

---

## 🔑 2. Idempotency Keys

### What is it?

Ensures the same request isn't executed twice, critical for payments/orders.

### Why needed?

```
User clicks "Pay" → Request sent
Network fails → User clicks "Pay" again
Without idempotency → Payment charged TWICE!
With idempotency → Second request returns cached response
```

### Files

- `api/utils/idempotency.js`

### Usage

```javascript
import { createIdempotencyMiddleware } from "./utils/idempotency.js";

// Add to routes
const idempotent = createIdempotencyMiddleware();
app.post("/api/orders", idempotent, orderController);
```

### Client usage

```javascript
// Generate a unique key for each unique operation
const key = crypto.randomUUID();

// First request
fetch("/api/orders", {
  method: "POST",
  headers: {
    "X-Idempotency-Key": key,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ amount: 100 }),
});

// Retry with SAME key if network fails
// Server returns cached response, no duplicate order!
```

### Response Headers

- `X-Idempotency-Key` - The key used
- `X-Idempotent-Replayed` - `true` if cached response returned

### Learning Resources:

- [Stripe Idempotency](https://stripe.com/blog/idempotency)
- [REST API Idempotency](https://restfulapi.net/idempotent-rest-apis/)

---

## 🗄️ 3. Database Migrations

### What is it?

Version-controlled schema changes for your database.

### Why needed?

- Schema evolves over time
- Team members need consistent schemas
- Production deployments must be reproducible
- Easy rollback when things go wrong

### Files

- `api/migrations/migrate.js`
- `api/migrations/migrations/` - Migration files
- `api/migrations/seeds/` - Seed files

### Commands

```bash
npm run migrate          # Run pending migrations
npm run migrate:rollback # Rollback last batch
npm run migrate:status   # Show status
npm run seed           # Seed database
```

### Creating a Migration

```javascript
// api/migrations/migrations/002_add_field.js
export const up = async (db) => {
  // Add field
  await db
    .collection("restaurants")
    .updateMany({}, { $set: { isFeatured: false } });
};

export const down = async (db) => {
  // Remove field
  await db
    .collection("restaurants")
    .updateMany({}, { $unset: { isFeatured: "" } });
};

export const meta = {
  version: 2,
  description: "Add isFeatured field to restaurants",
  author: "DevTeam",
  rollbackSafe: true,
};
```

### Creating a Seed

```javascript
// api/migrations/seeds/002_sample_restaurants.js
export const run = async (db) => {
  const restaurants = [
    { name: "Pizza Palace", city: "London" },
    { name: "Burger King", city: "Manchester" },
  ];

  await db.collection("restaurants").insertMany(restaurants);
};

export const meta = {
  description: "Sample restaurants",
  safe: true, // Can run multiple times
};
```

### Learning Resources

- [MongoDB Migrations](https://www.mongodb.com/docs/manual/core/migrations/)
- [Database Migrations Best Practices](https://www.prisma.io/dataguide/database-glossary#what-are-database-migrations)

---

## 🔄 4. Retry & Circuit Breaker

### What is it?

Handle temporary failures gracefully and prevent cascade failures.

### Files

- `api/utils/retry.js`

### Usage

```javascript
import { withRetry, getCircuitBreaker } from "./utils/retry.js";

// Simple retry
const result = await withRetry(() => fetch("/api/data"), {
  maxAttempts: 3,
  baseDelay: 100, // ms
  onRetry: (err, attempt) => {
    console.log(`Retry attempt ${attempt}: ${err.message}`);
  },
});

// Circuit breaker
const breaker = getCircuitBreaker("payment-service", {
  failureThreshold: 5,
  timeout: 60000,
});

const result = await breaker.execute(() => paymentService.process());
```

### How Circuit Breaker Works

```
CLOSED (Normal) → Failure threshold reached → OPEN (Failing)
OPEN → Timeout passes → HALF_OPEN (Testing recovery)
HALF_OPEN → Success threshold reached → CLOSED
```

### Learning Resources

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)

---

## 🏥 5. Health Checks

### What is it?

Endpoints that tell load balancers/monitoring if your app is healthy.

### Files

- `api/middlewares/healthCheck.js`

### Endpoints

```bash
GET /api/health    # Full health check (includes DB)
GET /api/live      # Liveness probe (is app running?)
GET /api/ready     # Readiness probe (can handle requests?)
```

### Usage

```javascript
import {
  createHealthCheck,
  createLivenessProbe,
  createReadinessProbe,
} from "./middlewares/healthCheck.js";

// Basic health (system info only)
app.get("/api/health", createHealthCheck());

// Kubernetes liveness
app.get("/api/live", createLivenessProbe());

// Kubernetes readiness (DB connected?)
app.get("/api/ready", createReadinessProbe());

// Detailed health with DB check
app.get("/api/health", createHealthCheck({ include: ["mongo", "system"] }));
```

### Learning Resources

- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Health Check API Design](https://cloud.google.com/blog/products/gcp/monitoring-your-microservices-on-kubernetes-the-enterprise-way)

---

## 🚀 Putting It All Together

### Production Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                      │
   ┌────▼────┐           ┌────▼────┐
   │ Server 1│           │ Server 2│
   │ /health │           │ /health │
   │ /metrics│           │ /metrics│
   └─────────┘           └─────────┘
```

### Kubernetes Deployment

```yaml
livenessProbe:
  httpGet:
    path: /api/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5

readinessProbe:
  httpGet:
    path: /api/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

resources:
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Prometheus Scrape

```yaml
scrape_configs:
  - job_name: "mern-restaurant"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/api/metrics"
```

---

## ✅ Checklist for Production

| Feature       | Status | Endpoint                 |
| ------------- | ------ | ------------------------ |
| Health Check  | ✅     | GET /api/health          |
| Liveness      | ✅     | GET /api/live            |
| Readiness     | ✅     | GET /api/ready           |
| Metrics       | ✅     | GET /api/metrics         |
| Idempotency   | ✅     | X-Idempotency-Key header |
| Migrations    | ✅     | npm run migrate          |
| Seeds         | ✅     | npm run seed             |
| Rate Limiting | ✅     | api/utils/rateLimit.js   |
| Retry/Circuit | ✅     | api/utils/retry.js       |
| Caching       | ✅     | api/utils/redisCache.js  |

---

## 📚 Further Learning

1. **Microservices Patterns**: [ microservices.io](https://microservices.io/)
2. **12-Factor App**: [12factor.net](https://12factor.net/)
3. **Kubernetes**: [kubernetes.io/docs](https://kubernetes.io/docs/)
4. **Prometheus**: [prometheus.io/docs](https://prometheus.io/docs/)
5. **MongoDB Indexes**: [MongoDB Indexing](https://www.mongodb.com/docs/manual/indexes/)

---

_Last Updated: 2026-02-28_
